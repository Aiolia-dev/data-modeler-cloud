import NewHero from "@/components/new-hero";
import FeaturesSection from "@/components/features-section";
import TechStack from "@/components/tech-stack";
import NewFooter from "@/components/new-footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
      {/* Hero section is outside the constrained container to allow full width */}
      <NewHero />
      
      <main className="flex-1 flex flex-col max-w-7xl mx-auto px-4 w-full">
        <TechStack />
        <FeaturesSection />
      </main>
      <NewFooter />
    </div>
  );
}
