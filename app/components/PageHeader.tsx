import { Sparkles } from "./Marks";
import SparkleField from "./SparkleField";

export default function PageHeader({
  title,
  lede,
}: {
  title: string;
  lede?: string;
}) {
  return (
    <header className="relative overflow-hidden border-b-2 border-red">
      <SparkleField />
      <div className="relative mx-auto max-w-6xl px-5 py-16 text-center sm:px-8 sm:py-24">
        <h1 className="headline rise">{title}</h1>
        <Sparkles className="mx-auto mt-6 h-10 w-14 text-red" />
        {lede && <p className="lede mx-auto mt-6 max-w-2xl">{lede}</p>}
      </div>
    </header>
  );
}
