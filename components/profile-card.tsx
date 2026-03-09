import Link from "next/link";
import Image from "next/image";

interface ProfileCardProps {
  user: {
    id: string;
    name: string | null;
    handle: string | null;
    avatar: string | null;
    roleTitle: string | null;
    bio: string | null;
    location: string | null;
    _count: {
      followers: number;
      following: number;
    };
  };
}

export function ProfileCard({ user }: ProfileCardProps) {
  return (
    <Link href={`/u/${user.handle}`}>
      <div className="border border-white p-6 hover:bg-white hover:text-black transition-colors h-full flex flex-col">
        <div className="flex items-start gap-4 mb-4">
          {user.avatar ? (
            <Image
              src={user.avatar}
              alt={user.name || "User"}
              width={64}
              height={64}
              className="border border-current"
            />
          ) : (
            <div className="w-16 h-16 border border-current flex items-center justify-center">
              <span className="text-2xl">{user.name?.[0]?.toUpperCase() || "?"}</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg truncate">{user.name || "Anonymous"}</h2>
            {user.handle && <p className="text-sm opacity-75">@{user.handle}</p>}
          </div>
        </div>

        {user.roleTitle && <p className="font-medium mb-2">{user.roleTitle}</p>}

        {user.bio && (
          <p className="text-sm opacity-75 mb-4 line-clamp-2 flex-1">{user.bio}</p>
        )}

        <div className="flex gap-4 text-sm">
          <span>
            <strong>{user._count.followers}</strong> followers
          </span>
          <span>
            <strong>{user._count.following}</strong> following
          </span>
        </div>

        {user.location && <p className="text-sm opacity-75 mt-2">{user.location}</p>}
      </div>
    </Link>
  );
}
