import { redirect } from "next/navigation";

export default function NewPatientRedirect() {
  redirect("/patients");
}
