export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Shop</h3>
            <ul className="mt-4 space-y-2">
              <li><a href="#" className="text-sm text-gray-600 hover:text-indigo-600">New Arrivals</a></li>
              <li><a href="#" className="text-sm text-gray-600 hover:text-indigo-600">Best Sellers</a></li>
              <li><a href="#" className="text-sm text-gray-600 hover:text-indigo-600">Sale</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Support</h3>
            <ul className="mt-4 space-y-2">
              <li><a href="#" className="text-sm text-gray-600 hover:text-indigo-600">Contact Us</a></li>
              <li><a href="#" className="text-sm text-gray-600 hover:text-indigo-600">FAQ</a></li>
              <li><a href="#" className="text-sm text-gray-600 hover:text-indigo-600">Shipping</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Account</h3>
            <ul className="mt-4 space-y-2">
              <li><a href="#" className="text-sm text-gray-600 hover:text-indigo-600">My Profile</a></li>
              <li><a href="#" className="text-sm text-gray-600 hover:text-indigo-600">Orders</a></li>
              <li><a href="#" className="text-sm text-gray-600 hover:text-indigo-600">Wishlist</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Newsletter</h3>
            <p className="mt-4 text-sm text-gray-600">Stay updated with our latest news and offers.</p>
            <div className="mt-4 flex">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full rounded-l-md border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <button className="rounded-r-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
                Join
              </button>
            </div>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center bg-transparent">
          <p className="text-xs text-gray-500 bg-transparent">&copy; 2026 QUICKSHOP. All rights reserved.</p>
          <div className="mt-4 md:mt-0 flex space-x-6">
            <a href="#" className="text-gray-400 hover:text-gray-500">Instagram</a>
            <a href="#" className="text-gray-400 hover:text-gray-500">Twitter</a>
            <a href="#" className="text-gray-400 hover:text-gray-500">Facebook</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
