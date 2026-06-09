import { Outlet } from 'react-router-dom';
import Navbar from '@/shared/components/Navbar';
import BackgroundBlobs from '@/shared/components/BackgroundBlobs';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fff6f9] via-[#fdf2ee] to-[#fff0f4] relative overflow-hidden">
      <BackgroundBlobs section="mid" />
      <Navbar />
      <main className="relative z-10 pt-20">
        <Outlet />
      </main>
    </div>
  );
}