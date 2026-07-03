import { PageHero } from "@/components/site/ui";
import ChannelRail from "@/components/site/contact/channel-rail";
import ContactForm from "@/components/site/contact/contact-form";
import MapFacade from "@/components/site/contact/map-facade";
import { site } from "@/content/site";

export const metadata = {
  title: "Contact Us",
  description: site.contactPage.hero.sub,
};

export default function ContactPage() {
  const { hero } = site.contactPage;
  return (
    <>
      <PageHero
        eyebrow={hero.eyebrow}
        titleLead={hero.titleLead}
        titleEm={hero.titleEm}
        sub={hero.sub}
      />

      <section className="mx-auto max-w-site px-5 py-16 md:px-8 md:py-24">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <ChannelRail />
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <ContactForm />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-site px-5 pb-24 md:px-8 md:pb-36">
        <MapFacade />
      </section>
    </>
  );
}
