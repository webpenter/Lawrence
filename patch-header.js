const fs = require('fs');
const file = 'src/components/layout/SiteHeader.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /<nav\s+className=\{clsx\([\s\S]*?\)\]\([\s\S]*?\}\s*>/,
  `<nav
      className={clsx(
        'relative z-10 w-full',
        onHero ? 'text-white' : 'border-b border-line bg-white text-ink',
      )}
    >
      <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between px-5 py-5 md:px-8 lg:px-12">`
);

content = content.replace(/<\/nav>/, '      </div>\n    </nav>');

fs.writeFileSync(file, content);
