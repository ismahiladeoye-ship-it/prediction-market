import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setSessionExpiredHandler } from '../api/client';
import { endSession, restoreSession } from '../store/session';

// Confirms the session once per page load and clears local account data if the
// server says it has ended (the API client refreshes expired tokens itself).
const useAuthCheck = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    setSessionExpiredHandler(() => dispatch(endSession()));
    dispatch(restoreSession());
  }, [dispatch]);
};

export default useAuthCheck;
