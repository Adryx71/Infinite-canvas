# Infinity Board 🎨

A infinite canvas whiteboard app I built because I got frustrated with existing ones. Miro is too expensive, Excalidraw doesn't have good pen support, and I wanted something that works offline.

## Why I Built This

I'm a college student who takes a lot of notes on my iPad. I tried every whiteboard app out there but they all had problems:

- **Miro** - $8/month? For a whiteboard? No thanks
- **Excalidraw** - Great but no pressure-sensitive drawing
- **Figma** - Overkill for simple notes
- **Notion** - Can't draw properly

So I decided to build my own. Took about 2 weeks of late nights and way too much coffee ☕

## Features (What Actually Works)

- ✅ Infinite canvas with pan/zoom (pinch on mobile!)
- ✅ Pressure-sensitive drawing (works with Apple Pencil)
- ✅ Multiple pen tools (pencil, pen, marker, highlighter)
- ✅ Shape tools (rectangle, circle, triangle, etc.)
- ✅ Selection tool with resize/rotate
- ✅ Multi-page support
- ✅ Dark/light theme
- ✅ Undo/redo (Ctrl+Z, double-tap on mobile)
- ✅ Autosave to IndexedDB (your work is safe!)
- ✅ Works offline (no internet needed)

## Tech Stack

- **React 19** - Because I already know it
- **PixiJS 8** - WebGL rendering is fast
- **Zustand** - State management that doesn't suck
- **Dexie** - IndexedDB wrapper (way easier than raw IDB)
- **Tailwind CSS** - Styling without fighting CSS
- **Framer Motion** - Smooth animations
- **Vite** - Fast builds

## Getting Started

```bash
# Clone it
git clone https://github.com/YOUR_USERNAME/infinity-board.git
cd infinity-board

# Install stuff
npm install

# Run it
npm run dev
```

Open http://localhost:5173 in your browser.

## Known Issues

- [ ] Drawing can lag on old devices (working on it)
- [ ] No file export yet (planning to add PNG/SVG export)
- [ ] Touch gestures can be finicky sometimes
- [ ] No collaboration features (maybe later?)

## What I Learned

Building this taught me a lot:
- PixiJS is powerful but has a steep learning curve
- Touch handling is WAY harder than mouse events
- IndexedDB is great for offline storage
- State management gets complex fast with canvas apps

## License

MIT License - do whatever you want with it

## Contact

If you have suggestions or find bugs, open an issue. I'm a student so responses might be slow during exam season 😅

---

*Built with ❤️ and way too many Stack Overflow tabs*
