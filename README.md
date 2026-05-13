# Gallery

A 3D immersive image gallery built with React Three Fiber, Firebase, and Stripe. Visitors fly through a WebGL scene to explore artwork; authenticated users can submit commission requests and purchase full-resolution downloads.

![image](https://github.com/user-attachments/assets/ad800319-e1f4-48f2-90eb-0dc246e2c539)

---

## Features

### 3D Gallery Scene
- **WebGL renderer** powered by [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) and Three.js.
- Images are arranged in a **sphere or grid layout** and rendered as billboard sprites inside a Bounding Volume Hierarchy (BVH) for fast raycasting.
- **Smooth animated camera** flies to each image on click using a custom eased transition.
- Full **OrbitControls** allow free panning, orbiting, and zooming around the scene.
- A central **glowing orb** acts as a clickable origin anchor to reset the camera.
- **HDR environment map** with configurable blurriness and intensity provides physically-based scene lighting. Custom `.hdr` files can be uploaded by the admin.

### Level-of-Detail (LOD) Image Loading
- Every uploaded image automatically gets **three quality levels** via a Firebase Cloud Function (Sharp):
  - **Thumbnail** – 256 px WebP (always generated, used at distance).
  - **Medium** – 1024 px WebP (generated for images > 1024 px; otherwise the original is used).
  - **High** – original file, loaded on demand when an image is clicked.
- Quality switches smoothly with **hysteresis buffers** to prevent flickering during camera movement.
- Images outside the render distance are hidden; textures are loaded through a **priority queue** so thumbnails always load first.
- **Animated GIFs and animated WebP** files are detected and rendered as HTML `<img>` elements to preserve animation, bypassing the LOD system.

### Image Management (Admin)
- Admins can **upload images** directly from the UI with a live progress indicator.
- Any uploaded image can be **deleted** with a single click via the delete button overlay.
- A **cleanup utility** removes orphaned Storage files that have no corresponding Firestore document.
- Image uploads trigger the `generateImageVariants` Cloud Function automatically.

### Appearance Customisation (Admin)
The **Settings panel** (admin-only) provides real-time control over:
- UI text colour and title colour
- Primary and secondary button colours
- Background environment blurriness and intensity
- Custom HDR environment file upload
- Social media links (X, Instagram, Reddit, YouTube, Discord, Email) displayed in the UI

All settings are persisted to Firestore and loaded on every page visit.

### Authentication
- Email/password sign-in and registration via **Firebase Authentication**.
- Admin status is granted through a **Firebase custom claim** (`admin: true`) set via the `setAdmin.js` script.
- The UI adapts dynamically — upload, delete, settings, and requests management controls are only visible to admins.

### Commission System
Users can submit **artwork commission requests** through the Commission modal:
- Select a product/price tier from the Stripe catalogue.
- Optionally attach a reference image.
- Track the status of all their requests (`pending` → `in-progress` → `completed`).
- Cancel pending requests.
- Deep-link support: a `?pay=<requestId>` URL parameter automatically opens the payment flow for a specific request.

Admins manage all incoming requests through the **Requests panel**:
- View and update request status.
- Upload the completed full-resolution artwork, which automatically generates a low-res preview and notifies the client.
- Send a **Stripe Invoice** to the client directly from the panel.

### Payments (Stripe)
- **Stripe Embedded Checkout** opens in-app for a seamless payment experience.
- Supports both catalogue prices (Stripe Product IDs) and ad-hoc dynamic prices.
- Webhook handler (`stripeWebhook`) listens for `checkout.session.completed` and `checkout.session.expired` events and updates Firestore accordingly.
- After payment, the client can **download the full-resolution artwork** via a secure signed Firebase Storage URL (enforced by the `getFullResDownloadUrl` Cloud Function).

### Stripe Product Catalogue (Admin)
- Admins can **create, view, and archive Stripe products** with names, descriptions, prices, and currencies directly from the **Products Management** modal — no Stripe dashboard required.

### My Collection
- Authenticated users have a **Collection** view listing all their completed commissions.
- Each entry shows the low-res preview and, once paid, provides a **one-click full-resolution download**.

### Email Notifications
- When a commission is marked as completed, a **transactional HTML email** is sent to the client via the Firebase Trigger Email extension.
- The email includes the low-res preview image and a call-to-action button linking back to the gallery.

### Performance
- **Adaptive texture load queue** with configurable concurrency; pauses new loads while the camera is moving to keep the frame rate smooth.
- `PerformanceMonitor` tracks frame times and can scale texture quality dynamically.
- Blob URL caching layer (`imageCache`) deduplicates network requests for textures.
- Vector3 object pool reduces GC pressure during per-frame calculations.
- WebGL renderer configured for high performance: no stencil buffer, no antialiasing, no preserved drawing buffer.

### Responsive UI
- All modals and the navigation bar adapt to **mobile and tablet** screen sizes.
- A collapsible hamburger menu is provided on small screens.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Three Fiber, Three.js, @react-three/drei, Zustand |
| Backend | Firebase (Firestore, Storage, Authentication, Cloud Functions) |
| Image processing | Sharp (Node.js Cloud Function) |
| Payments | Stripe (Embedded Checkout, Invoices, Webhooks) |
| Build | Vite |

---

## Project Structure

```
Client/
├── functions/          # Firebase Cloud Functions (Node.js)
│   ├── index.js        # Stripe, email, and preview generation functions
│   └── imageOptimization.js  # Automatic thumbnail/medium variant generation
└── src/
    ├── components/     # React UI and Three.js scene components
    ├── utils/          # Firebase helpers, texture loading, layout, auth
    ├── App.jsx         # Root scene and application logic
    └── store.js        # Zustand global state
```

---

## Setup

See [ADMIN_SETUP.md](ADMIN_SETUP.md), [STRIPE_SETUP.md](STRIPE_SETUP.md), and [EMAIL_SETUP.md](EMAIL_SETUP.md) for detailed configuration instructions.
