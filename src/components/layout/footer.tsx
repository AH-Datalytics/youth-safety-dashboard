export function Footer() {
  return (
    <footer className="border-t border-[#d4d4d4] bg-white py-4 px-4 text-center">
      <p className="text-xs text-[#666]">
        Built for the{" "}
        <span className="font-semibold text-primary">Lone Star Justice Alliance</span>
        {" "}&middot;{" "}
        Powered by{" "}
        <a
          href="https://ahdatalytics.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-primary hover:underline"
        >
          AH Datalytics
        </a>
      </p>
    </footer>
  );
}
