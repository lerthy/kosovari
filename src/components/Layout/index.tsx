// Importing the Header component
import { Header } from './Header';
// Importing Outlet for rendering child routes from React Router
import { Outlet } from 'react-router-dom';

// Layout component defines the page structure
export default function Layout() {
  return (
    // Full height container with vertical (column) flex layout
    <div className="h-screen flex flex-col">
      
      {/* Persistent header across all pages */}
      <Header />

      {/* Main content area where nested routes will be rendered */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
