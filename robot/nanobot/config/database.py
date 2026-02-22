"""SQLite3 configuration storage for nanobot."""

import json
import sqlite3
from pathlib import Path
from typing import Any


class ConfigDatabase:
    """SQLite3-based configuration storage for robot info and LLM config."""

    def __init__(self, db_path: Path | None = None):
        """
        Initialize database connection.

        Args:
            db_path: Path to SQLite database file. Defaults to ~/.nanobot/nanobot.db
        """
        if db_path is None:
            db_path = Path.home() / ".nanobot" / "nanobot.db"

        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

    def _get_connection(self) -> sqlite3.Connection:
        """Get a database connection."""
        return sqlite3.connect(str(self.db_path))

    def init_db(self) -> None:
        """Initialize database tables (idempotent)."""
        conn = self._get_connection()
        try:
            cursor = conn.cursor()

            # Generic key-value config table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS config (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            """)

            # Robot info table (decoded JWT claims)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS robot_info (
                    robot_id TEXT PRIMARY KEY,
                    robot_name TEXT,
                    tenant_id TEXT,
                    team_ids TEXT,
                    chat_group_ids TEXT,
                    creator_id TEXT,
                    creator_email TEXT,
                    platform_url TEXT,
                    robot_token TEXT
                )
            """)

            # LLM provider config table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS llm_config (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    provider TEXT NOT NULL,
                    api_key TEXT,
                    base_url TEXT,
                    model TEXT
                )
            """)

            conn.commit()
        finally:
            conn.close()

    def save_robot_info(self, data: dict[str, Any]) -> None:
        """
        Save robot information from decoded JWT.

        Args:
            data: Dictionary with keys: robot_id, robot_name, tenant_id,
                  team_ids (list), chat_group_ids (list), creator_id,
                  creator_email, platform_url, robot_token
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()

            # Convert lists to JSON strings for storage
            team_ids_json = json.dumps(data.get("team_ids", []))
            chat_group_ids_json = json.dumps(data.get("chat_group_ids", []))

            cursor.execute(
                """
                INSERT OR REPLACE INTO robot_info (
                    robot_id, robot_name, tenant_id, team_ids, chat_group_ids,
                    creator_id, creator_email, platform_url, robot_token
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    data.get("robot_id"),
                    data.get("robot_name"),
                    data.get("tenant_id"),
                    team_ids_json,
                    chat_group_ids_json,
                    data.get("creator_id"),
                    data.get("creator_email"),
                    data.get("platform_url"),
                    data.get("robot_token"),
                ),
            )

            conn.commit()
        finally:
            conn.close()

    def get_robot_info(self) -> dict[str, Any] | None:
        """
        Retrieve robot information.

        Returns:
            Dictionary with robot info or None if not found.
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM robot_info LIMIT 1")
            row = cursor.fetchone()

            if not row:
                return None

            # Parse row (robot_id, robot_name, tenant_id, team_ids, chat_group_ids,
            #            creator_id, creator_email, platform_url, robot_token)
            return {
                "robot_id": row[0],
                "robot_name": row[1],
                "tenant_id": row[2],
                "team_ids": json.loads(row[3]) if row[3] else [],
                "chat_group_ids": json.loads(row[4]) if row[4] else [],
                "creator_id": row[5],
                "creator_email": row[6],
                "platform_url": row[7],
                "robot_token": row[8],
            }
        finally:
            conn.close()

    def save_llm_config(self, data: dict[str, Any]) -> None:
        """
        Save LLM provider configuration.

        Args:
            data: Dictionary with keys: provider, api_key, base_url, model
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()

            # Clear existing config (simple single-provider approach)
            cursor.execute("DELETE FROM llm_config")

            cursor.execute(
                """
                INSERT INTO llm_config (provider, api_key, base_url, model)
                VALUES (?, ?, ?, ?)
            """,
                (
                    data.get("provider"),
                    data.get("api_key"),
                    data.get("base_url"),
                    data.get("model"),
                ),
            )

            conn.commit()
        finally:
            conn.close()

    def get_llm_config(self) -> dict[str, Any] | None:
        """
        Retrieve LLM provider configuration.

        Returns:
            Dictionary with LLM config or None if not found.
        """
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT provider, api_key, base_url, model FROM llm_config LIMIT 1")
            row = cursor.fetchone()

            if not row:
                return None

            return {"provider": row[0], "api_key": row[1], "base_url": row[2], "model": row[3]}
        finally:
            conn.close()

    def migrate_from_json(self, json_path: str | Path) -> None:
        """
        Migrate existing JSON config to SQLite database (one-time migration).

        Args:
            json_path: Path to existing config.json file
        """
        json_path = Path(json_path)

        if not json_path.exists():
            raise FileNotFoundError(f"Config file not found: {json_path}")

        with open(json_path) as f:
            config_data = json.load(f)

        platform = config_data.get("platform", {})
        if platform.get("robotToken"):
            robot_info = {
                "robot_id": platform.get("robotId", ""),
                "robot_name": platform.get("robotName", ""),
                "tenant_id": platform.get("tenantId", ""),
                "team_ids": platform.get("teamIds", []),
                "chat_group_ids": platform.get("chatGroupIds", []),
                "creator_id": platform.get("creatorId", ""),
                "creator_email": platform.get("creatorEmail", ""),
                "platform_url": platform.get("platformUrl", ""),
                "robot_token": platform.get("robotToken", ""),
            }
            self.save_robot_info(robot_info)

        providers = config_data.get("providers", {})
        agents = config_data.get("agents", {})
        defaults = agents.get("defaults", {})

        for provider_name, provider_config in providers.items():
            if provider_config.get("apiKey"):
                llm_config = {
                    "provider": provider_name,
                    "api_key": provider_config.get("apiKey"),
                    "base_url": provider_config.get("apiBase"),
                    "model": defaults.get("model", ""),
                }
                self.save_llm_config(llm_config)
                break
