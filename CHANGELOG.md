# Changelog

All notable changes to Infinity Board will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.0.0] - 2024-08-04

### Added
- Initial release
- Infinite canvas with pan/zoom
- Pressure-sensitive drawing with Apple Pencil support
- Multiple drawing tools (pencil, pen, marker, highlighter)
- Shape tools (rectangle, circle, triangle, diamond, star, polygon)
- Selection tool with resize and rotate
- Multi-page support
- Dark/light theme toggle
- Autosave to IndexedDB
- Undo/redo (Ctrl+Z / Ctrl+Shift+Z)
- Minimap for navigation
- Mobile-responsive design

### Known Issues
- Some lag on older devices with many strokes
- Touch gestures can be inconsistent on some Android devices

## [0.9.0] - 2024-07-28

### Added
- Selection tool with rotation support
- Resize handles for shapes
- Shape rotation with snap-to-grid

### Fixed
- Selection box not rotating with shapes
- Blue line artifact when selecting rotated shapes

## [0.8.0] - 2024-07-20

### Added
- Multi-page support
- Page thumbnails in sidebar
- Page navigation controls

### Fixed
- Data loss when switching pages without saving

## [0.7.0] - 2024-07-15

### Added
- Autosave to IndexedDB
- Settings persistence
- Version history snapshots

### Fixed
- Strokes disappearing on page refresh

## [0.6.0] - 2024-07-10

### Added
- Shape tools (rectangle, circle, triangle, etc.)
- Star and polygon shapes
- Shape fill color support

## [0.5.0] - 2024-07-05

### Added
- Eraser tool
- Tool settings panel
- Color picker with recent colors

### Fixed
- Eraser too slow on large canvases

## [0.4.0] - 2024-06-28

### Added
- Dark/light theme toggle
- Theme persistence in settings
- Glassmorphism UI design

## [0.3.0] - 2024-06-20

### Added
- Pressure-sensitive drawing
- Multiple pen tools (pencil, pen, marker, highlighter)
- Smooth stroke rendering with quadratic curves

## [0.2.0] - 2024-06-15

### Added
- Infinite canvas with pan/zoom
- Mouse wheel zoom
- Touch pinch-to-zoom

## [0.1.0] - 2024-06-10

### Added
- Basic canvas setup with PixiJS
- Simple drawing with mouse
- Basic React + Vite project structure
