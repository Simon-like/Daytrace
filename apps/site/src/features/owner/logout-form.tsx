export function OwnerLogoutForm({ csrfToken }: { csrfToken: string }) {
  return (
    <form method="post" action="/api/v1/auth/logout">
      <input type="hidden" name="csrf_token" value={csrfToken} />
      <button type="submit">退出主人视图</button>
    </form>
  );
}
