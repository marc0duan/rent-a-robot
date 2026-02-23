"use client"

import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { type Components } from "react-markdown"

interface MarkdownContentProps {
  content: string
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const components: Components = {
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "")
      const isInline = !match && !className

      if (isInline) {
        return (
          <code
            className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-amber-300"
            {...props}
          >
            {children}
          </code>
        )
      }

      return (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match ? match[1] : "text"}
          PreTag="div"
          customStyle={{
            margin: "0.5rem 0",
            borderRadius: "0.5rem",
            fontSize: "0.8rem",
            background: "#1e1e1e",
          }}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      )
    },
    p({ children }) {
      return <p className="mb-2 last:mb-0">{children}</p>
    },
    strong({ children }) {
      return <strong className="font-semibold text-foreground">{children}</strong>
    },
    em({ children }) {
      return <em className="italic">{children}</em>
    },
    ul({ children }) {
      return <ul className="mb-2 list-disc pl-4">{children}</ul>
    },
    ol({ children }) {
      return <ol className="mb-2 list-decimal pl-4">{children}</ol>
    },
    li({ children }) {
      return <li className="mb-1">{children}</li>
    },
    a({ href, children }) {
      return (
        <a
          href={href}
          className="text-blue-400 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      )
    },
    table({ children }) {
      return (
        <div className="my-2 overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-700">
            {children}
          </table>
        </div>
      )
    },
    thead({ children }) {
      return <thead className="bg-zinc-800/50">{children}</thead>
    },
    tbody({ children }) {
      return <tbody className="divide-y divide-zinc-700">{children}</tbody>
    },
    tr({ children }) {
      return <tr>{children}</tr>
    },
    th({ children }) {
      return (
        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">
          {children}
        </th>
      )
    },
    td({ children }) {
      return <td className="px-3 py-2 text-xs">{children}</td>
    },
    blockquote({ children }) {
      return (
        <blockquote className="border-l-4 border-zinc-600 pl-3 italic text-zinc-400">
          {children}
        </blockquote>
      )
    },
    h1({ children }) {
      return <h1 className="mb-2 mt-4 text-xl font-bold">{children}</h1>
    },
    h2({ children }) {
      return <h2 className="mb-2 mt-3 text-lg font-bold">{children}</h2>
    },
    h3({ children }) {
      return <h3 className="mb-1 mt-2 text-base font-bold">{children}</h3>
    },
    hr() {
      return <hr className="my-4 border-zinc-700" />
    },
  }

  return (
    <div className="text-sm text-foreground/90">
      <ReactMarkdown components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
