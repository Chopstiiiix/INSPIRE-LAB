import { getUsers } from "@/app/actions/users";
import { ProfileCard } from "@/components/profile-card";
import { LoadMoreButton } from "@/components/load-more-button";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { cursor?: string };
}) {
  const { users, nextCursor } = await getUsers(searchParams.cursor);

  if (users.length === 0 && !searchParams.cursor) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Welcome to INSPIRE-LAB</h1>
        <p className="text-lg opacity-75">No profiles yet. Be the first to join!</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Discover Professionals</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {users.map((user) => (
          <ProfileCard key={user.id} user={user} />
        ))}
      </div>

      {nextCursor && <LoadMoreButton cursor={nextCursor} />}
    </div>
  );
}
