# Interactive Globe

Interactive country globe built with React, TypeScript, and Three.js.

## Features

- Drag to rotate (upright axis)
- Scroll to zoom
- Country hover and click events
- Responsive on desktop and mobile

## Run locally

```bash
npm install
npm run dev
```

## Scripts

```bash
npm run dev      # start Vite dev server
npm run build    # type-check + production build
npm run preview  # preview production build
npm run check    # TypeScript checks only
```

## Component

Main component: `src/components/InteractiveGlobe.tsx`

Common props:

- `countries`
- `globeImageUrl`
- `bumpImageUrl`
- `highlightOnHover`
- `onPointHover`
- `onPointClick`

Example:

```tsx
<InteractiveGlobe
  countries={countries}
  onPointHover={(point) => console.log("hover", point)}
  onPointClick={(point) => console.log("click", point)}
/>
```
