import { signOut } from '../../lib/auth/client';

export default function SignOutButton() {
  async function onClick() {
    await signOut();
    window.location.href = '/login';
  }
  return (
    <button
      onClick={onClick}
      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
    >
      Sign out
    </button>
  );
}
