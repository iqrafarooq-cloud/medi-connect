import { EmptyPanel } from "@/components/care-placeholders";
import { Container } from "@/components/container";

export default function ClinicScreen() {
  return (
    <Container isScrollable={false} className="px-4">
      <EmptyPanel
        icon="medkit-outline"
        title="No clinic selected"
        body="You’ll choose a facility for pre-arrival routing and consults here. Until then, nothing is assigned."
      />
    </Container>
  );
}
