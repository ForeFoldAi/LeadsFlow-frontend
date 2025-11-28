export default function AppFooter() {
  return (
    <footer className="border-t bg-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-gray-600">
          <span>Developed & Maintained by</span>
          <a
            href="https://forefoldai.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
          >
            ForeFold AI
          </a>
        </div>
      </div>
    </footer>
  );
}

