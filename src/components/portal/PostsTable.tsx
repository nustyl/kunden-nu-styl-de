import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DeadlineBadge } from "@/components/ui/DeadlineBadge";
import { formatDateTime } from "@/lib/format";
import { POST_FORMAT_LABELS, type Post } from "@/types/database";

export function PostsTable({ posts }: { posts: Post[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-ink-700">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-ink-800 text-left text-xs uppercase tracking-wide text-ink-400">
            <th className="px-3 py-2 font-medium">Titel</th>
            <th className="px-3 py-2 font-medium">Format</th>
            <th className="px-3 py-2 font-medium">Posting</th>
            <th className="px-3 py-2 font-medium">Frist</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr
              key={post.id}
              className="border-t border-ink-700 hover:bg-ink-800/60 transition-colors"
            >
              <td className="px-3 py-2">
                <Link href={`/beitraege/${post.id}`} className="font-medium hover:text-orange-400">
                  {post.title}
                </Link>
              </td>
              <td className="px-3 py-2 text-ink-300">{POST_FORMAT_LABELS[post.format]}</td>
              <td className="px-3 py-2 text-ink-300 whitespace-nowrap">
                {formatDateTime(post.publish_date)}
              </td>
              <td className="px-3 py-2">
                <DeadlineBadge deadline={post.approval_deadline} />
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={post.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
