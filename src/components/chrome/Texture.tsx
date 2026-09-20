/**
 * A single static grain layer over the whole page. Carbon paper is not smooth,
 * and a flat dark background reads as a template; this is the cheapest way to
 * make the ground feel like a material. It never animates and never intercepts
 * a pointer.
 */
export default function Texture() {
  return <div className="texture" aria-hidden="true" />;
}
