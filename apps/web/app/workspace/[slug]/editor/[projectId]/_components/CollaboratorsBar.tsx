"use client";

interface Collaborator {
  name: string;
  color: string;
}

export default function CollaboratorsBar({
  collaborators,
  currentUser,
}: {
  collaborators: Collaborator[];
  currentUser: Collaborator;
}) {
  const all = [currentUser, ...collaborators];

  return (
    <div className="flex items-center -space-x-1">
      {all.slice(0, 5).map((c, i) => (
        <div
          key={i}
          title={c.name}
          className="w-7 h-7 rounded-full border-2 border-[#0d0d14] flex items-center justify-center text-xs font-bold"
          style={{ backgroundColor: c.color }}
        >
          {(c.name || "?").charAt(0).toUpperCase()}
        </div>
      ))}
      {all.length > 5 && (
        <div className="w-7 h-7 rounded-full border-2 border-[#0d0d14] bg-gray-600 flex items-center justify-center text-xs">
          +{all.length - 5}
        </div>
      )}
    </div>
  );
}
