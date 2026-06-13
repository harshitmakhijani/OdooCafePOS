import { Placeholder } from '@/routes/Placeholder';

/** POS landing — last session info + Open Session (PRD §9.2). */
export function SessionLanding() {
  return (
    <Placeholder title="POS — Session" prd="§9.2">
      <p>Shows last open session date + last closing sale, and an Open Session button (pick a register).</p>
    </Placeholder>
  );
}
