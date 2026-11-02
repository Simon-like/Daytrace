export function OwnerLoginLink({ returnTo = "/owner" }: { returnTo?: string }) {
  const hasControl = Array.from(returnTo).some((character) =>
    character.charCodeAt(0) <= 0x1f || character.charCodeAt(0) === 0x7f
  );
  const destination = /^\/(?![/\\])[^\\]*$/.test(returnTo) && !hasControl ? returnTo : "/owner";
  return <a href={`/api/v1/auth/login?returnTo=${encodeURIComponent(destination)}`}>主人登录</a>;
}
