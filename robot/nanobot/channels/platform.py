"""Platform channel for receiving messages from Perseus platform via SSE."""

from __future__ import annotations

import asyncio
import json
import re
import httpx
from loguru import logger

from nanobot.bus.events import InboundMessage, OutboundMessage
from nanobot.bus.queue import MessageBus
from nanobot.channels.base import BaseChannel
from nanobot.config.schema import PlatformConfig


class PlatformChannel(BaseChannel):
    """
    Platform channel for receiving messages from Perseus platform via SSE.

    Connects to {platform_url}/api/v1/robots/stream and subscribes to all
    chat groups the robot is a member of.
    """

    name = "platform"

    # Connection settings
    HEARTBEAT_INTERVAL = 30  # seconds
    RECONNECT_BASE_DELAY = 1  # seconds
    RECONNECT_MAX_DELAY = 30  # seconds
    CONNECT_TIMEOUT = 30  # seconds

    def __init__(
        self,
        config: PlatformConfig,
        bus: MessageBus,
    ):
        super().__init__(config, bus)
        self.config: PlatformConfig = config
        self._running = False
        self._reader_task: asyncio.Task | None = None
        self._heartbeat_task: asyncio.Task | None = None
        self._stream_url: str = ""
        self._reconnect_delay = self.RECONNECT_BASE_DELAY

    def _get_stream_url(self) -> str:
        """Get the SSE stream URL from platform URL."""
        platform_url = self.config.platform_url.rstrip("/")

        # Add https:// if no scheme provided
        if not platform_url.startswith("http://") and not platform_url.startswith("https://"):
            platform_url = "http://" + platform_url

        return platform_url + f"/api/v1/robots/{self.config.robot_id}/stream"

    async def start(self) -> None:
        """Start the platform channel and connect to SSE stream."""
        if not self.config.platform_url:
            logger.error("Platform URL not configured")
            return

        if not self.config.robot_token:
            logger.error("Robot token not configured")
            return


        if not self.config.robot_id:
            logger.error("Robot ID not configured, cannot connect to per-robot stream")
            return
        self._running = True
        self._stream_url = self._get_stream_url()
        logger.info(f"Platform channel connecting to {self._stream_url}")

        # Start heartbeat task
        self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())

        # Start the reader task
        self._reader_task = asyncio.create_task(self._connect_and_read())

    async def stop(self) -> None:
        """Stop the platform channel."""
        self._running = False

        # Cancel tasks
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
            try:
                await self._heartbeat_task
            except asyncio.CancelledError:
                pass

        if self._reader_task:
            self._reader_task.cancel()
            try:
                await self._reader_task
            except asyncio.CancelledError:
                pass

        logger.info("Platform channel stopped")

    async def send(self, msg: OutboundMessage) -> None:
        """Send a message to the platform via POST."""
        if not self.config.robot_id:
            logger.warning("Cannot send: robot_id not configured")
            return

        platform_url = self.config.platform_url.rstrip("/")
        if not platform_url.startswith("http://") and not platform_url.startswith("https://"):
            platform_url = "http://" + platform_url

        url = f"{platform_url}/api/v1/robots/{self.config.robot_id}/messages"
        headers = {
            "X-Robot-Token": self.config.robot_token,
            "Content-Type": "application/json",
        }
        payload = {
            "chatGroupId": msg.chat_id,
            "content": msg.content,
        }

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code != 201:
                    logger.warning(
                        f"Platform POST failed: {response.status_code} {response.text}"
                    )
                else:
                    logger.debug(f"Message sent to chatgroup {msg.chat_id}")
        except Exception as e:
            logger.warning(f"Failed to send message to platform: {e}")

    async def _heartbeat_loop(self) -> None:
        """Send periodic heartbeats to keep connection alive."""
        while self._running:
            await asyncio.sleep(self.HEARTBEAT_INTERVAL)
            logger.debug("Platform channel heartbeat")

    async def _connect_and_read(self) -> None:
        """Connect to SSE stream and process messages."""
        while self._running:
            try:
                await self._connect_sse()
            except asyncio.CancelledError:
                break
            except Exception as e:
                if not self._running:
                    break
                logger.warning(f"SSE connection error: {e}")
                await self._wait_before_reconnect()

    async def _connect_sse(self) -> None:
        """Connect to SSE endpoint using HTTP and process stream."""

        url = self._stream_url
        headers = {
            "X-Robot-Token": self.config.robot_token,
            "Accept": "text/event-stream",
        }

        timeout = httpx.Timeout(self.CONNECT_TIMEOUT, read=None)

        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream("GET", url, headers=headers) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    logger.error(f"SSE connection failed with status {response.status_code}: {error_text}")
                    await self._wait_before_reconnect()
                    return

                logger.info("Platform channel connected to SSE stream")
                self._reconnect_delay = self.RECONNECT_BASE_DELAY  # Reset on successful connect

                # Process SSE stream
                buffer = ""
                async for chunk in response.aiter_bytes(chunk_size=1024):
                    if not self._running:
                        break

                    # Decode chunk
                    text = chunk.decode("utf-8", errors="replace")
                    buffer += text

                    # Process complete events
                    while "\n\n" in buffer:
                        event, buffer = buffer.split("\n\n", 1)
                        await self._process_sse_event(event)

    async def _process_sse_event(self, event: str) -> None:
        """Process a single SSE event."""
        lines = event.strip().split("\n")
        if not lines:
            return

        # Parse event type and data
        event_type = "message"
        data = ""

        for line in lines:
            if line.startswith("event:"):
                event_type = line[6:].strip()
            elif line.startswith("data:"):
                data = line[5:].strip()

        # Skip comments and keepalive
        if event_type.startswith(":"):
            return

        if event_type == "keepalive":
            return

        if event_type == "message" and data:
            logger.info(f"SSE received event_type={event_type}, data={data[:100]}...")
            try:
                payload = json.loads(data)
                # Extract the actual message from the payload
                # SSE format: {"type": "new_message", "message": {...}}
                if payload.get("type") == "new_message":
                    message = payload.get("message", {})
                elif payload.get("type") == "mention":
                    message = payload.get("message", {})
                else:
                    message = payload
                logger.info(f"[PLATFORM] Extracted message: {message}")
                await self._handle_platform_message(message)
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse SSE message: {e}")

    async def _handle_platform_message(self, message: dict) -> None:
        """Handle an incoming message from the platform."""
        # Message structure from platform:
        # {
        #   "id": "msg_xxx",
        #   "chatGroupId": "cg_xxx",
        #   "content": "@TestBot hello",
        #   "senderId": "user_xxx",
        #   "senderType": "user",
        #   "createdAt": "2024-..."
        # }

        chat_group_id = message.get("chatGroupId", "")
        content = message.get("content", "")
        sender_id = message.get("senderId", "")
        sender_type = message.get("senderType", "user")
        message_id = message.get("id", "")


        # Skip self-sent messages to avoid echo loops
        if sender_id == self.config.robot_id:
            logger.debug(f"Ignoring self-sent message {message_id}")
            return
        if not content:
            return

        # Build sender identifier
        if sender_type == "robot":
            full_sender_id = f"robot:{sender_id}"
        else:
            full_sender_id = sender_id

        logger.info(f"[PLATFORM] Message from {full_sender_id} in {chat_group_id}: {content[:50]}...")

        # Forward to the message bus
        logger.info(f"[PLATFORM] Sending to bus: sender={full_sender_id}, chat={chat_group_id}")
        await self._handle_message(
            sender_id=full_sender_id,
            chat_id=chat_group_id,
            content=content,
            metadata={
                "message_id": message_id,
                "sender_type": sender_type,
                "platform_message": True,
            }
        )
        logger.info(f"[PLATFORM] Message sent to bus")

    async def _wait_before_reconnect(self) -> None:
        """Wait with exponential backoff before reconnecting."""
        delay = self._reconnect_delay
        self._reconnect_delay = min(
            self._reconnect_delay * 2,
            self.RECONNECT_MAX_DELAY
        )
        logger.info(f"Reconnecting in {delay}s...")
        await asyncio.sleep(delay)
