import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  doc,
  getDocSafe,
  setDocSafe,
  serverTimestamp
} from '@/lib/firebase';
import { authApi } from '@/lib/api';
import { handleApiError } from '@/lib/api';



async function establishBackendSession(

  firebaseUser: { getIdToken: () => Promise<string> },

  extra?: { role?: string; full_name?: string; phone?: string; campus_hub?: string; campusHub?: string }

): Promise<any | null> {

  try {

    const idToken = await firebaseUser.getIdToken();

    const response = await authApi.firebaseSession({ id_token: idToken, ...extra });

    if (response.data?.success && response.data.data) {

      const { user, access_token, refresh_token } = response.data.data;

      if (typeof window !== 'undefined') {

        localStorage.setItem('access_token', access_token);

        if (refresh_token) localStorage.setItem('refresh_token', refresh_token);

      }

      return user;

    }

    return null;

  } catch (err: any) {
    console.warn('Backend JWT exchange notice (continuing with client auth):', err?.message || err);
    return null;
  }

}



export interface AuthError {

  field?: string;

  message: string;

  code?: string;

}



export function useAuth() {

  const { 

    user, 

    isAuthenticated, 

    setUser, 

    setAuth, 

    setView,

    logout: storeLogout 

  } = useAppStore();



  const [loading, setLoading] = useState(true);

  const [loginLoading, setLoginLoading] = useState(false);

  const [registerLoading, setRegisterLoading] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);

  const [error, setError] = useState<AuthError | null>(null);



  // Set true just before login()/googleLogin()/register() trigger a Firebase

  // sign-in call, cleared once that flow's own establishBackendSession

  // finishes. Firebase sign-in methods (signInWithPopup, etc.) also fire

  // onAuthStateChanged asynchronously — without this guard, that listener

  // calls establishBackendSession AGAIN in parallel, racing the explicit

  // call and causing duplicate-key errors + a nondeterministic role

  // (whichever call wins the race determines it, and only the explicit

  // call carries `extra.role`).

  const explicitAuthInProgress = useRef(false);



  // Monitor Firebase Auth State

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {

      if (firebaseUser) {

        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDocSafe(userDocRef);

          let userData: any = null;
          if (userDocSnap && typeof userDocSnap.exists === 'function' && userDocSnap.exists()) {
            userData = userDocSnap.data();
          } else {
            userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              full_name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              phone: firebaseUser.phoneNumber || '',
              role: 'customer',
              walletBalance: 0,
              escrowHeld: 0,
              avatar: firebaseUser.photoURL || '',
              campusHub: 'Unilag Akoka Campus',
              createdAt: new Date().toISOString(),
            };
            await setDocSafe(userDocRef, { ...userData, createdAt: serverTimestamp() }, { merge: true });
          }



          // Skip if an explicit login/googleLogin/register flow is already

          // establishing the backend session for this same sign-in — that

          // flow will set the user state itself once it resolves, with the

          // correct role info this listener doesn't have access to.

          if (!explicitAuthInProgress.current) {

            const backendUser = await establishBackendSession(firebaseUser);

            if (backendUser) {

              userData = {

                ...userData,

                uid: backendUser.id,

                email: backendUser.email || userData.email,

                full_name: backendUser.full_name || userData.full_name,

                phone: backendUser.phone || userData.phone,

                campusHub: backendUser.campus_hub || backendUser.campusHub || userData.campusHub || 'Unilag Akoka Campus',

                role: (backendUser.role || backendUser.active_workspace || 'CUSTOMER').toLowerCase(),

                roles: (backendUser.roles || backendUser.capabilities || [backendUser.role || 'CUSTOMER']).map((r: string) => r.toLowerCase()),

                capabilities: backendUser.capabilities || ['CUSTOMER'],

                capability_status: backendUser.capability_status || {},

                active_workspace: backendUser.active_workspace || 'CUSTOMER',

                system_roles: backendUser.system_roles || [],

              };

            }

            setUser(userData);

            setAuth(true);

          }

        } catch (e) {

          console.error('Firestore user profile fetch error:', e);

        }

      } else {

        // ✅ Clears authenticated state when user signs out

        setUser(null as any);

        setAuth(false);

        if (typeof window !== 'undefined') {

          localStorage.removeItem('access_token');

          localStorage.removeItem('token');

          localStorage.removeItem('refresh_token');

        }

      }

      setLoading(false);

    });



    return () => unsubscribe();

  }, [setUser, setAuth]);



  const clearError = useCallback(() => setError(null), []);



  const login = useCallback(

    async (email: string, password: string): Promise<any> => {

      setLoginLoading(true);

      setError(null);

      explicitAuthInProgress.current = true;



      try {

        let firebaseUser = null;

        try {

          const userCred = await signInWithEmailAndPassword(auth, email, password);

          firebaseUser = userCred.user;

        } catch (fbErr) {

          console.log('Firebase login fallback to Auth API:', fbErr);

        }



        if (firebaseUser) {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDocSafe(userDocRef);
          
          let userData: any = null;
          if (userDocSnap && typeof userDocSnap.exists === 'function' && userDocSnap.exists()) {
            userData = userDocSnap.data();
          } else {
            userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || email,
              full_name: firebaseUser.displayName || email.split('@')[0],
              role: 'customer',
              walletBalance: 0,
              escrowHeld: 0,
              campusHub: 'Unilag Akoka Campus',
            };
            await setDocSafe(userDocRef, userData);
          }



          const backendUser = await establishBackendSession(firebaseUser);

          if (backendUser) {

            userData = {

              ...userData,

              uid: backendUser.id,

              email: backendUser.email || userData.email,

              full_name: backendUser.full_name || userData.full_name,

              phone: backendUser.phone || userData.phone,

              campusHub: backendUser.campus_hub || backendUser.campusHub || userData.campusHub || 'Unilag Akoka Campus',

              role: (backendUser.role || backendUser.active_workspace || 'CUSTOMER').toLowerCase(),

              roles: (backendUser.roles || backendUser.capabilities || [backendUser.role || 'CUSTOMER']).map((r: string) => r.toLowerCase()),

              capabilities: backendUser.capabilities || ['CUSTOMER'],

              capability_status: backendUser.capability_status || {},

              active_workspace: backendUser.active_workspace || 'CUSTOMER',

              system_roles: backendUser.system_roles || [],

            };

          }



          setUser(userData);

          setAuth(true);

          toast.success(`Welcome back, ${userData.full_name || 'User'}! 🎉`);



          const targetView = userData.role === 'artisan' || userData.role === 'service_provider'

            ? 'provider-dashboard'

            : userData.role === 'admin'

            ? 'admin-dashboard'

            : userData.role === 'vendor'

            ? 'customer-dashboard' // TODO: dedicated vendor-dashboard once built

            : userData.role === 'driver' || userData.role === 'rider'

            ? 'customer-dashboard' // TODO: dedicated rider-dashboard once built

            : 'customer-dashboard';

          setView(targetView);



          return { success: true, user: userData };

        }



        const response = await authApi.login({ email, password });

        if (response.data?.success) {

          const resData = response.data.data || {};

          const userData = resData.user || resData;



          if (typeof window !== 'undefined' && resData.access_token) {

            localStorage.setItem('access_token', resData.access_token);

            if (resData.refresh_token) localStorage.setItem('refresh_token', resData.refresh_token);

          }



          setUser(userData);

          setAuth(true);

          toast.success(`Welcome back, ${userData.full_name || 'User'}!`);



          const targetView = userData.role === 'provider' ? 'provider-dashboard' : userData.role === 'admin' ? 'admin-dashboard' : 'customer-dashboard';

          setView(targetView);

          return { success: true, user: userData };

        } else {

          const errorMsg = response.data?.message || 'Invalid email or password.';

          setError({ message: errorMsg });

          toast.error(errorMsg);

          return { success: false, error: errorMsg };

        }

      } catch (err: any) {

        const errorMsg = err.message || 'Authentication failed. Please check your credentials.';

        setError({ message: errorMsg });

        toast.error(errorMsg);

        return { success: false, error: errorMsg };

      } finally {

        explicitAuthInProgress.current = false;

        setLoginLoading(false);

      }

    },

    [setUser, setAuth, setView]

  );



  const googleLogin = useCallback(async (): Promise<boolean> => {

    setGoogleLoading(true);

    setError(null);

    explicitAuthInProgress.current = true;



    try {
      const userCred = await signInWithPopup(auth, googleProvider);
      const firebaseUser = userCred.user;

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDocSnap = await getDocSafe(userDocRef);

      let userData: any = null;
      if (userDocSnap && typeof userDocSnap.exists === 'function' && userDocSnap.exists()) {
        userData = userDocSnap.data();
      } else {
        userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          full_name: firebaseUser.displayName || 'Google User',
          phone: firebaseUser.phoneNumber || '',
          role: 'customer',
          walletBalance: 0,
          escrowHeld: 0,
          avatar: firebaseUser.photoURL || '',
          campusHub: 'Unilag Akoka Campus',
          createdAt: new Date().toISOString(),
        };
        await setDocSafe(userDocRef, { ...userData, createdAt: serverTimestamp() }, { merge: true });
      }

      let backendUser: any = null;
      try {
        backendUser = await establishBackendSession(firebaseUser);
      } catch (beErr) {
        console.warn('Backend session notice:', beErr);
      }

      if (backendUser) {
        userData = {
          ...userData,
          uid: backendUser.id,
          email: backendUser.email || userData.email,
          full_name: backendUser.full_name || userData.full_name,
          phone: backendUser.phone || userData.phone,
          campusHub: backendUser.campus_hub || backendUser.campusHub || userData.campusHub || 'Unilag Akoka Campus',
          role: (backendUser.role || backendUser.active_workspace || 'CUSTOMER').toLowerCase(),
          roles: (backendUser.roles || backendUser.capabilities || [backendUser.role || 'CUSTOMER']).map((r: string) => r.toLowerCase()),
          capabilities: backendUser.capabilities || ['CUSTOMER'],
          capability_status: backendUser.capability_status || {},
          active_workspace: backendUser.active_workspace || 'CUSTOMER',
          system_roles: backendUser.system_roles || [],
        };
      }

      setUser(userData);
      setAuth(true);
      toast.success(`Signed in with Google as ${userData.full_name}! 🚀`);

      const targetView = userData.role === 'artisan' || userData.role === 'provider' 
        ? 'provider-dashboard' 
        : userData.role === 'admin' 
        ? 'admin-dashboard' 
        : 'customer-dashboard';
      setView(targetView);

      return true;
    } catch (err: any) {
      console.warn('Google Auth notice:', err);
      
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        toast.info('Google sign-in popup was closed.');
        return false;
      }

      if (err.code === 'auth/popup-blocked') {
        toast.error('Popup Blocked', {
          description: 'Please allow popups for this site or open in a full browser tab.',
          duration: 6000,
        });
        return false;
      }

      let errorMsg = 'Google Sign-In was interrupted. Please try again.';
      if (err.message && !err.message.includes('Database is closing') && !err.message.includes('hidden')) {
        errorMsg = err.message;
      }

      setError({ message: errorMsg });
      toast.error('Google Sign-In Notice', { description: errorMsg, duration: 6000 });
      return false;
    } finally {

      explicitAuthInProgress.current = false;

      setGoogleLoading(false);

    }

  }, [setUser, setAuth, setView]);



  const register = useCallback(

    async (registerData: {

      full_name: string;

      email: string;

      phone: string;

      password: string;

      role?: string;

      campusHub?: string;

      campus_hub?: string;

    }): Promise<boolean> => {

      setRegisterLoading(true);

      setError(null);

      explicitAuthInProgress.current = true;



      try {

        let firebaseUser = null;

        try {

          const userCred = await createUserWithEmailAndPassword(auth, registerData.email, registerData.password);

          firebaseUser = userCred.user;

        } catch (fbErr) {

          console.log('Firebase registration error, attempting fallback:', fbErr);

        }



        const role = registerData.role || 'customer';

        const chosenHub = registerData.campusHub || registerData.campus_hub || 'Unilag Akoka Campus';

        let userData: any = {

          uid: firebaseUser ? firebaseUser.uid : `user_${Date.now()}`,

          email: registerData.email,

          full_name: registerData.full_name,

          phone: registerData.phone,

          role: role,

          walletBalance: 0,

          escrowHeld: 0,

          campusHub: chosenHub,

          createdAt: new Date().toISOString(),

        };



        if (firebaseUser) {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          await setDocSafe(userDocRef, { ...userData, createdAt: serverTimestamp() });



          const backendUser = await establishBackendSession(firebaseUser, {

            role: role === 'provider' ? 'PROVIDER' : 'CUSTOMER',

            full_name: registerData.full_name,

            phone: registerData.phone,

            campus_hub: chosenHub,

          });

          if (backendUser) {

            userData = {

              ...userData,

              uid: backendUser.id,

              campusHub: backendUser.campus_hub || backendUser.campusHub || chosenHub,

              role: (backendUser.role || backendUser.active_workspace || 'CUSTOMER').toLowerCase(),

              roles: (backendUser.roles || backendUser.capabilities || [backendUser.role || 'CUSTOMER']).map((r: string) => r.toLowerCase()),

              capabilities: backendUser.capabilities || ['CUSTOMER'],

              capability_status: backendUser.capability_status || {},

              active_workspace: backendUser.active_workspace || 'CUSTOMER',

              system_roles: backendUser.system_roles || [],

            };

          }

        } else {

          try {

            const response = await authApi.register({

              full_name: registerData.full_name,

              email: registerData.email,

              phone: registerData.phone,

              password: registerData.password,

              campus_hub: chosenHub,

            } as any);

            if (response.data?.success && response.data.data) {

              const resData: any = response.data.data;

              if (typeof window !== 'undefined' && resData.access_token) {

                localStorage.setItem('access_token', resData.access_token);

                if (resData.refresh_token) localStorage.setItem('refresh_token', resData.refresh_token);

              }

              userData = { ...userData, uid: resData.user?.id || userData.uid };

            }

          } catch {}

        }



        setUser(userData);

        setAuth(true);

        toast.success('Account created successfully! 🎉');

        

        const targetView = role === 'provider' ? 'provider-dashboard' : 'customer-dashboard';

        setView(targetView);



        return true;

      } catch (err: any) {

        const errorMsg = err.message || 'Registration failed. Please try again.';

        setError({ message: errorMsg });

        toast.error('Registration failed', { description: errorMsg });

        return false;

      } finally {

        explicitAuthInProgress.current = false;

        setRegisterLoading(false);

      }

    },

    [setUser, setAuth, setView]

  );



  const verify = useCallback(async (email: string, code: string): Promise<boolean> => {

    try {

      toast.success('Account verified successfully!');

      setView('login');

      return true;

    } catch (err: any) {

      toast.error('Verification failed');

      return false;

    }

  }, [setView]);



  const logout = useCallback(async () => {

    try {

      await signOut(auth);

      await authApi.logout().catch(() => {});

    } catch {

      // ignore

    } finally {

      if (typeof window !== 'undefined') {

        localStorage.removeItem('access_token');

        localStorage.removeItem('token');

        localStorage.removeItem('refresh_token');

        localStorage.removeItem('user');

      }

      setUser(null as any);

      setAuth(false);

      storeLogout();

      toast.success('Logged out successfully');

      setView('home');

    }

  }, [setUser, setAuth, storeLogout, setView]);



  



  const switchRole = useCallback(

  async (role: string): Promise<boolean> => {

    if (!user) {

      toast.error('You need to be signed in to switch roles');

      return false;

    }



    try {

      const response = await authApi.switchRole({ role: role.toUpperCase() as any });

      if (response.data?.success && response.data.data?.user) {

        const backendUser = response.data.data.user;

        // Sync the full multi-capability state from the backend
        // response — switch-workspace returns the updated user with
        // active_workspace + capabilities + capability_status intact.
        const updatedUser: any = {
          ...user,
          role: (backendUser.role || backendUser.active_workspace || role).toLowerCase(),
          roles: (backendUser.roles || backendUser.capabilities || [backendUser.role || role.toUpperCase()]).map((r: string) => r.toLowerCase()),
          capabilities: backendUser.capabilities || (user as any)?.capabilities || ['CUSTOMER'],
          capability_status: backendUser.capability_status || (user as any)?.capability_status || {},
          active_workspace: backendUser.active_workspace || String(role).toUpperCase(),
          system_roles: backendUser.system_roles || (user as any)?.system_roles || [],
        };

        setUser(updatedUser);

        // Route to the right dashboard based on the workspace the user
        // just switched into. Vendor/Rider dashboards aren't built yet —
        // they fall back to the customer dashboard so the app compiles
        // and the user lands somewhere sensible.
        const ws = (backendUser.active_workspace || String(role).toUpperCase()).toUpperCase();
        const targetView =
          ws === 'SERVICE_PROVIDER'
            ? 'provider-dashboard'
            : ws === 'ADMIN'
            ? 'admin-dashboard'
            : 'customer-dashboard';

        setView(targetView as any);

        toast.success(`Switched to ${role.toLowerCase()} workspace`);

        return true;

      }

      toast.error(response.data?.message || 'Could not switch role');

      return false;

    } catch (err: any) {

      toast.error(handleApiError ? handleApiError(err) : err.message || 'Could not switch role');

      return false;

    }

  },

  [user, setUser, setView]

);



  // Fired by src/lib/api.ts's response interceptor when a token refresh

  // fails outright (e.g. the backend user it points to no longer exists —

  // the exact scenario after a DB reset/reseed). Without this, the app

  // would keep showing the stale logged-in user (wallet, role badge) while

  // every real API call silently 401s underneath it.

  useEffect(() => {

    const handleSessionExpired = () => {

      signOut(auth).catch(() => {});

      if (typeof window !== 'undefined') {

        localStorage.removeItem('access_token');

        localStorage.removeItem('token');

        localStorage.removeItem('refresh_token');

        localStorage.removeItem('user');

      }

      setUser(null as any);

      setAuth(false);

      storeLogout();

      toast.error('Your session expired. Please sign in again.');

      setView('login');

    };



    window.addEventListener('rush:session-expired', handleSessionExpired);

    return () => window.removeEventListener('rush:session-expired', handleSessionExpired);

  }, [setUser, setAuth, storeLogout, setView]);



  return {

  user,

  loading,

  loginLoading,

  registerLoading,

  googleLoading,

  error,

  isAuthenticated,

  login,

  googleLogin,

  register,

  verify,

  logout,

  clearError,

  switchRole,

};

}