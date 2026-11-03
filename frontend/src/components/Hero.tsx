import { ArrowDown, ArrowUpRight, MapPin } from "lucide-react";
import kyoto from "@/assets/kyoto.jpg";

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="label-eyebrow hero-eyebrow"><span /> A little inspiration. A real itinerary.</p>
        <h1 id="hero-title">Less planning.<br />More <em>possibility.</em></h1>
        <p className="hero-description">Big adventures start with a small idea. Tell us yours, and let a team of travel agents weave the details together.</p>
        <a href="#planner" className="hero-link">Start with your idea <ArrowDown size={16} /></a>
        <div className="hero-note"><span className="note-line" /><p>Flights, stays, weather &amp; budget.<br /><strong>Thoughtfully planned. Reviewed by you.</strong></p></div>
      </div>
      <figure className="destination-card">
        <img src={kyoto} alt="A quiet stone street leading to Yasaka Pagoda in Kyoto, Japan" width="1000" height="1500" />
        <div className="destination-tag"><MapPin size={13} /> Kyoto, Japan</div>
        <figcaption>
          <span className="destination-kicker">Somewhere worth getting lost.</span>
          <span className="destination-title">Your next chapter starts somewhere.</span>
          <a href="#planner" className="destination-arrow" aria-label="Start planning your trip"><ArrowUpRight size={24} /></a>
        </figcaption>
        <a className="photo-credit" href="https://unsplash.com/photos/joBzbU-MkuE" target="_blank" rel="noreferrer noopener">Photo: Yannick de Vries / Unsplash</a>
      </figure>
    </section>
  );
}
