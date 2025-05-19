# KosovAR

KosovAR is a web application designed to help users report and track community issues using an interactive map interface and Augmented Reality (AR) features. It encourages civic engagement by making issue reporting intuitive, visual, and gamified.

---

## 🚀 Features

- 🔐 User authentication (Sign up / Login via Supabase)
- 📝 Report issues with categories, images, and geolocation
- 🗺️ View issues on an interactive map
- 💬 Comment on and 👍 like reported issues
- 📱 AR integration via QR codes for location-based interaction
- 🛠️ Admin panel to manage user reports and activity
- 🧬 User level-up system based on engagement and contributions

---

## 🧰 Technologies Used

- **Frontend:** React.js, TypeScript, Vite, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Geolocation:** Custom controllers + OpenStreetMap or geocoding API
- **State Management:** Zustand or Context API (depending on feature)
- **AR Tools:** QR Code generation + camera-triggered behavior

---

## ⚙️ Installation

### Prerequisites

- Node.js (v16+ recommended)
- A Supabase account with a project created
- Basic knowledge of `.env` configuration


## Getting Started
### Installation
1. Clone the repository:
```bash
git clone https://github.com/yourusername/kosovaar.git
cd kosovaar
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm start
# or
yarn start
```
