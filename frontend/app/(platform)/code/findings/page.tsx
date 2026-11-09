import { redirect } from 'next/navigation';

export default function LegacyCodeFindingsRedirect() {
  redirect('/findings');
}
