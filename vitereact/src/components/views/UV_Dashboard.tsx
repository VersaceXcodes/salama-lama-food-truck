// Shows proper auth state access and logout

import React from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/main';

const UV_Dashboard: React.FC = () => {
  // CRITICAL: Individual selectors, no object destructuring
  const currentUser = useAppStore(state => state.authentication_state.current_user);

  return (
    <>
      {/* Main content with proper spacing */}
      <div className="min-h-screen bg-[#F2EFE9]">
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="border-4 border-dashed border-[#D4C5B0] rounded-xl p-8 bg-white shadow-lg">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-[#2C1A16] mb-4">
                  Welcome back, {currentUser?.first_name} {currentUser?.last_name}!
                </h2>
                <p className="text-[#2C1A16]/70 mb-6 text-lg">
                  This is your protected dashboard. You can only see this because you're authenticated.
                </p>
                <div className="bg-[#F2EFE9] border-2 border-[#D4C5B0] rounded-lg p-6 max-w-md mx-auto">
                  <p className="text-[#2C1A16] text-base mb-2">
                    <strong className="font-semibold">Email:</strong> {currentUser?.email}
                  </p>
                  <p className="text-[#2C1A16] text-base">
                    <strong className="font-semibold">User ID:</strong> {currentUser?.user_id}
                  </p>
                </div>
                <div className="mt-8 flex justify-center space-x-4">
                  <Link
                    to="/menu"
                    className="inline-flex items-center px-8 py-3 border border-transparent text-base font-semibold rounded-lg text-white bg-[#D97706] hover:bg-[#B45309] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 transition-all duration-200"
                  >
                    Browse Menu
                  </Link>
                  <Link
                    to="/profile"
                    className="inline-flex items-center px-8 py-3 border-2 border-[#2C1A16] text-base font-medium rounded-lg text-[#2C1A16] bg-white hover:bg-[#F2EFE9] focus:outline-none focus:ring-2 focus:ring-[#D97706] focus:ring-offset-2 transition-all duration-200"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default UV_Dashboard;