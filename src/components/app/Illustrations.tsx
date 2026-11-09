import backpack from "@/assets/spot-backpack.png";
import books from "@/assets/spot-books.png";
import bridge from "@/assets/spot-bridge.png";
import envelope from "@/assets/spot-envelope.png";
import flowers from "@/assets/spot-flowers.png";
import journal from "@/assets/spot-journal.png";
import mailbox from "@/assets/spot-mailbox.png";
import rocks from "@/assets/spot-rocks.png";
import seedling from "@/assets/spot-seedling.png";
import signpost from "@/assets/spot-signpost.png";
import stones from "@/assets/spot-stones.png";
import wateringcan from "@/assets/spot-wateringcan.png";
import loaderBirds from "@/assets/loader-birds.png";
import loaderCloud from "@/assets/loader-cloud.png";
import loaderGround from "@/assets/loader-ground.png";
import loaderTree from "@/assets/loader-tree.png";
import loaderWalker from "@/assets/loader-walker.png";
import { cn } from "@/lib/utils";

const spots = { backpack, books, bridge, envelope, flowers, journal, mailbox, rocks, seedling, signpost, stones, wateringcan } as const;

/** A small painted object. Decorative, so hidden from screen readers. */
export function Spot({ name, className }: { name: keyof typeof spots; className?: string }) {
  return <img src={spots[name]} alt="" aria-hidden="true" className={cn("spot-art", className)} />;
}

/** The student walking up a painted path. The walker is a four-frame strip played with steps(). */
export function PathLoader({ className }: { className?: string }) {
  return (
    <div className={cn("path-loader", className)} aria-hidden="true">
      <img src={loaderCloud} alt="" className="path-loader-cloud" />
      <img src={loaderBirds} alt="" className="path-loader-birds" />
      <img src={loaderTree} alt="" className="path-loader-tree" />
      <img src={loaderGround} alt="" className="path-loader-ground" />
      <span className="path-loader-walker"><img src={loaderWalker} alt="" /></span>
    </div>
  );
}
