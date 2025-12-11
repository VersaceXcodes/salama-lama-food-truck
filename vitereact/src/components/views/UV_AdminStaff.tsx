const authToken = useAppStore(state => state.authentication_state.auth_token);
const currentUser = useAppStore(state => state.authentication_state.current_user);
// NEVER: const { authToken, currentUser } = useAppStore(state => state.authentication_state)