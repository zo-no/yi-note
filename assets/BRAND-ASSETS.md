# wildframe brand assets

## Design and provenance

The camera character is an original, hand-built vector illustration based on a
written description. No original reference image pixels were available, sampled,
traced, embedded, or reused. Its proportions, hat contour, reflections and facial
details are an interpretation, not a pixel-accurate reproduction of the reference.

The mark uses a warm rounded canvas, an ink camera body with short arms, a cream
front, an oversized left-hand lens, a small right-hand eye, a terracotta viewfinder
and a domed hat. The full-size version has a subtle hat highlight, a glass
reflection and a small smile. The small version is separately drawn on a 16-unit
grid: no hat texture, hat highlight, smile, fine lens arc, or flash slit. It keeps
one lens reflection and a solid crown/brim. There are no gradients or drop shadows.

| Token | Color | Use |
| --- | --- | --- |
| Canvas | `#F3EFE6` | Rounded icon tile, cream camera panel, hero background |
| Surface | `#FFFCF7` | Lens ring/reflections, hero surface |
| Ink | `#292D2A` | Camera body, lens, wordmark and text |
| Terracotta | `#AB634F` | Hat crown, viewfinder, accent |
| Sage | `#879284` | Glass reflection and quiet secondary detail |
| Action | `#97513D` | Hat brim/band, timestamp and small labels |

Antialiased edge pixels and explicitly translucent details blend these colors;
they are not additional palette tokens. Transparent corners outside the rounded
tile allow icons to sit on different surfaces.

## Source files

- `assets/wildframe-icon.svg`: 512 × 512 master, editable geometric paths/shapes.
- `assets/wildframe-icon-small.svg`: 16 × 16 optical variant used at 16/32/48px.
- `assets/wildframe-hero.svg`: 1200 × 640 self-contained brand composition with
  lowercase `wildframe`, English video-notes copy and the camera character.
  This is an illustrative brand card, not a screenshot or a claim about current UI.

The hero typography uses macOS Avenir Next (Regular, Medium and Demi Bold),
converted through CoreText to ordinary SVG paths. No font files are bundled;
viewing or rasterizing the committed SVG does not require those fonts. Text labels
remain in `aria-label`, `<title>` and `<desc>`. Hero type is outlined rather than
live editable text. To change the wording, replace the relevant path with a
`<text>` element using `x`, `y`, `font-family` (PostScript name such as
`AvenirNext-Medium`), `font-size`, optional `letter-spacing`, and `fill`, then run
the generator on macOS to outline it again. Simple English text is supported.

The hero's `brand-icon:start/end` region is refreshed from the master SVG on every
generation. Edit the master instead of the embedded copy.

## Generated files

| Output | Dimensions / frames | Source |
| --- | --- | --- |
| `assets/logo.png` | 512 × 512 | Master |
| `packages/extension/icons/icon-16.png` | 16 × 16 | Small |
| `packages/extension/icons/icon-48.png` | 48 × 48 | Small |
| `packages/extension/icons/icon-128.png` | 128 × 128 | Master |
| `packages/landing/static/images/logo.png` | 128 × 128 | Master |
| `packages/landing/static/images/favicon.png` | 512 × 512 | Master; high-resolution input for Gatsby manifest generation |
| `assets/hero.png` | 1200 × 640 | Hero |
| `packages/landing/static/images/hero.png` | 1200 × 640 | Hero; identical bytes to `assets/hero.png` |
| `packages/playground/favicon.ico` | 16 / 32 / 48 / 256px | Small for 16–48, master for 256 |

The ICO is a real ICO container: 32-bit BGRA DIB frames with transparency masks
at 16/32/48px, and a PNG-compressed 256px frame. It is not a renamed PNG.
No unused extension resolutions are added, and no manifest changes are needed.

## Regeneration and checks

From the repository root, with a modern Node.js (16+):

```sh
node scripts/generate-brand-assets.cjs
node scripts/generate-brand-assets.cjs --check
```

The generator resolves the existing `sharp` from the project/landing workspace
first. At creation time, `node_modules/sharp` was version 0.27.1 and could not load
because `build/Release/sharp.node` was missing. These exports were therefore
rendered with the system Swift 6.2.1 / AppKit on macOS 26, without installing or
rebuilding any dependencies. The fallback requires `xcrun swift` / Xcode Command
Line Tools and macOS with SVG support in `NSImage` (verified on this machine).
On other platforms, an already working SVG-capable `sharp` is required. CoreText
is needed only if new live text must be outlined; checked-in outlined type works
with either rasterizer. Different rasterizer/OS versions can produce small
antialiasing or PNG-encoding differences, not different vector geometry.

The script stages all raster exports before replacement. Temporary Swift source,
compiler caches and staging files live only under `assets/.brand-render-*` and
are removed on completion (including ordinary exceptions). If a process is
forcibly killed, its temporary directory can be removed manually.

Validation checks PNG signatures, chunk CRCs, decompressed scanlines, dimensions
and nonempty pixels. It checks ICO directory offsets, dimensions, DIB headers,
frame lengths and the embedded PNG, then independently decodes all ICO frames
with macOS ImageIO when available. `--check` validates without regenerating
assets; its temporary native-validation helper is cleaned up as well.

## Installation probe and scope

`packages/extension/installed.png` is **not a brand image**: the existing file is a
fully transparent 3 × 2 PNG, exposed in `manifest.common.json` as a web-accessible
resource and copied unchanged by `webpack.common.js`. No in-repository consumer
was found, so external installation probes may rely on it. Its path, bytes,
dimensions, transparency and manifest entry are deliberately preserved. The
script checks its original SHA-256 before and after generation:

```text
8a8fadfdebcc65982f3ec100c3ef0c3e23f0ebe1c2475b075875afd9f44e352e
```

Browser/service/share icons and generic operation icons are not rebranded. This
asset-only work does not edit application copy, themes, source components,
package/dependency manifests, lockfiles, or generated extension build outputs.
Existing user edits elsewhere in the working tree are left intact.
