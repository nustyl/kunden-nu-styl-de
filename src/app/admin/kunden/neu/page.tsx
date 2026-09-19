import { createClientCompany } from "@/lib/actions/admin";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { inputClass, labelClass, cardClass } from "@/lib/ui-classes";

export default function NewClientPage() {
  return (
    <div className="max-w-md grid gap-6">
      <h1 className="text-2xl font-display font-semibold">Neuer Kunde</h1>
      <form action={createClientCompany} className={`${cardClass} grid gap-4`}>
        <div>
          <label htmlFor="name" className={labelClass}>
            Firmenname
          </label>
          <input id="name" name="name" required className={inputClass} />
        </div>
        <SubmitButton pendingLabel="Wird angelegt…" className="justify-self-start">
          Anlegen
        </SubmitButton>
      </form>
    </div>
  );
}
