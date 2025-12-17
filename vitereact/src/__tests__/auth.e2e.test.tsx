// @ts-nocheck
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

import UV_Signup from '@/components/views/UV_Signup';
import UV_Login from '@/components/views/UV_Login';
import { useAppStore } from '@/store/main';

// Wrapper component for router context
const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Auth E2E Flow (Real API)', () => {
  // Generate unique email and phone for this test run to avoid conflicts
  const timestamp = Date.now();
  const uniqueEmail = `testuser${timestamp}@example.com`;
  const testPassword = 'TestPass123';
  const testPhone = `+35387${timestamp.toString().slice(-7)}`; // Use timestamp in phone number
  const testFirstName = 'Test';
  const testLastName = 'User';

  beforeEach(() => {
    // Clear localStorage to ensure clean state
    localStorage.clear();
    
    // Reset Zustand store to initial state
    useAppStore.setState((state) => ({
      authentication_state: {
        ...state.authentication_state,
        auth_token: null,
        current_user: null,
        authentication_status: {
          is_authenticated: false,
          is_loading: false,
        },
        error_message: null,
      },
    }));
  });

  it('completes full auth flow: register -> logout -> login', async () => {
    const user = userEvent.setup();

    // =====================================================
    // STEP 1: REGISTER A NEW USER
    // =====================================================
    const { unmount: unmountSignup } = render(<UV_Signup />, { wrapper: Wrapper });

    // Wait for form to be ready
    const firstNameInput = await screen.findByLabelText(/first name/i);
    const lastNameInput = await screen.findByLabelText(/last name/i);
    const emailInput = await screen.findByLabelText(/email address/i);
    const phoneInput = await screen.findByLabelText(/phone number/i);
    const passwordInput = await screen.findByLabelText(/^password/i);
    const passwordConfirmInput = await screen.findByLabelText(/confirm password/i);
    const termsCheckbox = screen.getByRole('checkbox', { name: /terms & conditions/i });
    const createAccountButton = screen.getByRole('button', { name: /create account/i });

    // Fill in registration form
    await user.type(firstNameInput, testFirstName);
    await user.type(lastNameInput, testLastName);
    await user.type(emailInput, uniqueEmail);
    await user.type(phoneInput, testPhone);
    await user.type(passwordInput, testPassword);
    await user.type(passwordConfirmInput, testPassword);
    await user.click(termsCheckbox);

    // Wait for button to be enabled
    await waitFor(() => expect(createAccountButton).not.toBeDisabled());

    // Submit registration
    await user.click(createAccountButton);

    // Wait for registration to complete and user to be authenticated
    await waitFor(
      () => {
        const state = useAppStore.getState();
        expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
        expect(state.authentication_state.auth_token).toBeTruthy();
        expect(state.authentication_state.current_user).toBeTruthy();
        expect(state.authentication_state.current_user?.email).toBe(uniqueEmail);
        expect(state.authentication_state.current_user?.role).toBe('customer');
      },
      { timeout: 20000 }
    );

    // Verify user object has expected fields
    const stateAfterRegister = useAppStore.getState();
    expect(stateAfterRegister.authentication_state.current_user?.first_name).toBe(testFirstName);
    expect(stateAfterRegister.authentication_state.current_user?.last_name).toBe(testLastName);

    // Clean up signup component
    unmountSignup();

    // =====================================================
    // STEP 2: LOGOUT
    // =====================================================
    const logoutAction = useAppStore.getState().logout_user;
    await logoutAction();

    // Verify user is logged out
    await waitFor(() => {
      const state = useAppStore.getState();
      expect(state.authentication_state.authentication_status.is_authenticated).toBe(false);
      expect(state.authentication_state.auth_token).toBeNull();
      expect(state.authentication_state.current_user).toBeNull();
    });

    // =====================================================
    // STEP 3: LOGIN WITH THE SAME CREDENTIALS
    // =====================================================
    render(<UV_Login />, { wrapper: Wrapper });

    // Wait for login form to be ready (use more specific selectors)
    const loginEmailInput = await screen.findByLabelText(/email address/i);
    const loginPasswordInput = screen.getByPlaceholderText(/enter your password/i);
    const signInButton = await screen.findByRole('button', { name: /sign in/i });

    // Ensure inputs are enabled before typing
    await waitFor(() => {
      expect(loginEmailInput).not.toBeDisabled();
      expect(loginPasswordInput).not.toBeDisabled();
    });

    // Fill in login form
    await user.type(loginEmailInput, uniqueEmail);
    await user.type(loginPasswordInput, testPassword);

    // Wait for button to be enabled
    await waitFor(() => expect(signInButton).not.toBeDisabled());

    // Submit login
    await user.click(signInButton);

    // Wait for "Signing in..." loading state
    await waitFor(() => {
      expect(screen.queryByText(/signing in/i)).toBeInTheDocument();
    });

    // Wait for login to complete and user to be authenticated
    await waitFor(
      () => {
        const state = useAppStore.getState();
        expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
        expect(state.authentication_state.auth_token).toBeTruthy();
        expect(state.authentication_state.current_user).toBeTruthy();
        expect(state.authentication_state.current_user?.email).toBe(uniqueEmail);
        expect(state.authentication_state.current_user?.role).toBe('customer');
      },
      { timeout: 20000 }
    );

    // Verify the re-authenticated user has the same details
    const stateAfterLogin = useAppStore.getState();
    expect(stateAfterLogin.authentication_state.current_user?.first_name).toBe(testFirstName);
    expect(stateAfterLogin.authentication_state.current_user?.last_name).toBe(testLastName);
  }, 60000); // Increase test timeout to 60 seconds for full E2E flow

  it('handles login with invalid credentials gracefully', async () => {
    const user = userEvent.setup();

    render(<UV_Login />, { wrapper: Wrapper });

    // Wait for login form (use more specific selectors)
    const emailInput = await screen.findByLabelText(/email address/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const signInButton = await screen.findByRole('button', { name: /sign in/i });

    // Try to log in with invalid credentials
    await user.type(emailInput, 'nonexistent@example.com');
    await user.type(passwordInput, 'WrongPassword123');

    await waitFor(() => expect(signInButton).not.toBeDisabled());
    await user.click(signInButton);

    // Wait for error message to appear
    await waitFor(
      () => {
        // Should show authentication error
        const errorMessage = screen.queryByText(/invalid email or password/i);
        expect(errorMessage).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    // Verify user is not authenticated
    const state = useAppStore.getState();
    expect(state.authentication_state.authentication_status.is_authenticated).toBe(false);
    expect(state.authentication_state.auth_token).toBeNull();
  }, 30000);

  it('handles registration with duplicate email', async () => {
    const user = userEvent.setup();

    render(<UV_Signup />, { wrapper: Wrapper });

    // Use an email that's likely to already exist in the seed data
    const duplicateEmail = 'john.smith@email.ie'; // From seed data

    const firstNameInput = await screen.findByLabelText(/first name/i);
    const lastNameInput = await screen.findByLabelText(/last name/i);
    const emailInput = await screen.findByLabelText(/email address/i);
    const phoneInput = await screen.findByLabelText(/phone number/i);
    const passwordInput = await screen.findByLabelText(/^password/i);
    const passwordConfirmInput = await screen.findByLabelText(/confirm password/i);
    const termsCheckbox = screen.getByRole('checkbox', { name: /terms & conditions/i });
    const createAccountButton = screen.getByRole('button', { name: /create account/i });

    // Fill in form with duplicate email
    await user.type(firstNameInput, 'Duplicate');
    await user.type(lastNameInput, 'User');
    await user.type(emailInput, duplicateEmail);
    await user.type(phoneInput, '+353871111111');
    await user.type(passwordInput, testPassword);
    await user.type(passwordConfirmInput, testPassword);
    await user.click(termsCheckbox);

    await waitFor(() => expect(createAccountButton).not.toBeDisabled());
    await user.click(createAccountButton);

    // Wait for error message
    await waitFor(
      () => {
        const errorMessage = screen.queryByText(/email already/i);
        expect(errorMessage).toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    // Verify user is not authenticated
    const state = useAppStore.getState();
    expect(state.authentication_state.authentication_status.is_authenticated).toBe(false);
  }, 30000);
});
