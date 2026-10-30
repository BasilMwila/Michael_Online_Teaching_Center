import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import ChatbotWidget from './ChatbotWidget.jsx';
import ScrollToTop from './ScrollToTop.jsx';
import WhatsAppButton from './WhatsAppButton.jsx';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <ChatbotWidget />
      <WhatsAppButton />
    </div>
  );
}
