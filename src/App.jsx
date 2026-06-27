import React, { useState, useEffect } from 'react';
import { 
  auth, 
  signInWithPopup, 
  googleProvider,
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from './firebase';
import { 
  INITIAL_LOCATIONS, 
  INITIAL_BOOKINGS 
} from '../../web-user/src/services/mockDb'; // Reuse shared seed schemas
import { 
  MapPin, Plus, DollarSign, Activity, FileText, CheckCircle, XCircle, 
  Globe, LogOut, Compass, Users, Clock, AlertCircle, HelpCircle, RefreshCw, Camera,
  Lock, Shield, Info, User, CreditCard, Building, Check, Trash2, Edit2, Eye, EyeOff,
  History, QrCode
} from 'lucide-react';

const INDIAN_BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "IndusInd Bank",
  "Bank of Baroda",
  "Punjab National Bank",
  "Canara Bank",
  "Union Bank of India",
  "Bank of India",
  "Indian Bank",
  "Central Bank of India",
  "UCO Bank",
  "Bank of Maharashtra",
  "Indian Overseas Bank",
  "YES Bank",
  "IDFC FIRST Bank",
  "Federal Bank",
  "South Indian Bank",
  "Karur Vysya Bank",
  "Karnataka Bank",
  "RBL Bank",
  "Bandhan Bank",
  "Jammu & Kashmir Bank"
];

export default function App() {
  const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://parkhub-wefh.onrender.com/api';

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('parkeasy_owner');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email || '';
        const cleanInput = email.trim().toLowerCase();
        const isSuresh = cleanInput === 'suresh@spotowner.com';
        
        let loggedUser;
        if (isSuresh) {
          loggedUser = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || "Suresh Perumal",
            email: firebaseUser.email,
            phone: firebaseUser.phoneNumber || "+91 94440 12345",
            role: "owner",
            verified: true,
            gstin: "33AABCP8921J1Z0",
            profilePic: firebaseUser.photoURL || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
            createdAt: new Date().toISOString()
          };
        } else {
          loggedUser = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || "Host User",
            email: firebaseUser.email,
            phone: firebaseUser.phoneNumber || "+91 90000 00000",
            role: "owner",
            verified: true,
            gstin: "33AABCP" + Math.floor(1000 + Math.random() * 9000) + "J1Z0",
            profilePic: firebaseUser.photoURL || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200",
            createdAt: new Date().toISOString()
          };
        }
        
        try {
          await fetch(`${API_URL}/owners/${loggedUser.uid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loggedUser)
          });
        } catch (e) {
          console.error("Error syncing owner profile:", e);
        }

        setUser(loggedUser);
        localStorage.setItem('parkeasy_owner', JSON.stringify(loggedUser));
      } else {
        setUser(null);
        localStorage.removeItem('parkeasy_owner');
      }
    });
    return () => unsubscribe();
  }, [API_URL]);

  const [locations, setLocations] = useState(INITIAL_LOCATIONS);
  const [bookings, setBookings] = useState(INITIAL_BOOKINGS);
  const [globalRates, setGlobalRates] = useState({ halfHour: 20, hourly: 50, daily: 300 });
  const [complaints, setComplaints] = useState([]);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportDesc, setSupportDesc] = useState('');

  const [currentTab, setCurrentTab] = useState('overview');
  const [analyticsFilter, setAnalyticsFilter] = useState('daily');
  const [customAlert, setCustomAlert] = useState(null); 
  const [customConfirm, setCustomConfirm] = useState(null); 
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showAlert = (message, title = "Notification") => {
    setCustomAlert({ title, message });
  };

  const showConfirm = (message, onConfirm, title = "Confirmation") => {
    setCustomConfirm({ title, message, onConfirm });
  };

  // Sync state from backend in real-time
  useEffect(() => {
    const fetchData = async () => {
      try {
        const locRes = await fetch(`${API_URL}/locations`);
        if (locRes.ok) setLocations(await locRes.json());
      } catch (err) { console.error("Error fetching locations:", err); }

      try {
        const bookRes = await fetch(`${API_URL}/bookings`);
        if (bookRes.ok) setBookings(await bookRes.json());
      } catch (err) { console.error("Error fetching bookings:", err); }

      try {
        const setRes = await fetch(`${API_URL}/settings`);
        if (setRes.ok) {
          const s = await setRes.json();
          if (s.globalHourlyRate && s.globalDailyRate) {
            setGlobalRates({ halfHour: s.global30MinRate || 20, hourly: s.globalHourlyRate, daily: s.globalDailyRate });
          }
          if (s.commissionPercentage !== undefined) {
            setCommissionRate(s.commissionPercentage);
          }
        }
      } catch (err) { console.error("Error fetching settings:", err); }

      try {
        const compRes = await fetch(`${API_URL}/complaints`);
        if (compRes.ok) setComplaints(await compRes.json());
      } catch (err) { console.error("Error fetching complaints:", err); }

      try {
        const saved = localStorage.getItem('parkeasy_owner');
        const parsed = saved ? JSON.parse(saved) : null;
        if (parsed && parsed.uid) {
          const ownerRes = await fetch(`${API_URL}/owners/${parsed.uid}`);
          if (ownerRes.ok) {
            const data = await ownerRes.json();
            setUser(prev => ({ ...prev, ...data }));
          }
        }
      } catch (err) { console.error("Error fetching owner profile:", err); }
    };

    fetchData();

    // Poll for updates (e.g. available slots fluctuating on server, new user bookings)
    const interval = setInterval(async () => {
      try {
        const locRes = await fetch(`${API_URL}/locations`);
        if (locRes.ok) setLocations(await locRes.json());
      } catch (err) { console.error("Error polling locations:", err); }
      
      try {
        const bookRes = await fetch(`${API_URL}/bookings`);
        if (bookRes.ok) setBookings(await bookRes.json());
      } catch (err) { console.error("Error polling bookings:", err); }

      try {
        const compRes = await fetch(`${API_URL}/complaints`);
        if (compRes.ok) setComplaints(await compRes.json());
      } catch (err) { console.error("Error polling complaints:", err); }

      try {
        const setRes = await fetch(`${API_URL}/settings`);
        if (setRes.ok) {
          const s = await setRes.json();
          if (s.globalHourlyRate && s.globalDailyRate) {
            setGlobalRates({ halfHour: s.global30MinRate || 20, hourly: s.globalHourlyRate, daily: s.globalDailyRate });
          }
          if (s.commissionPercentage !== undefined) {
            setCommissionRate(s.commissionPercentage);
          }
        }
      } catch (err) { console.error("Error polling settings:", err); }

      try {
        const saved = localStorage.getItem('parkeasy_owner');
        const parsed = saved ? JSON.parse(saved) : null;
        if (parsed && parsed.uid) {
          const ownerRes = await fetch(`${API_URL}/owners/${parsed.uid}`);
          if (ownerRes.ok) {
            const data = await ownerRes.json();
            setUser(prev => {
              if (!prev) return data;
              if (prev.kycStatus !== data.kycStatus || 
                  prev.earnings !== data.earnings || 
                  prev.payoutMethod !== data.payoutMethod ||
                  JSON.stringify(prev.bankDetails) !== JSON.stringify(data.bankDetails) ||
                  JSON.stringify(prev.upiDetails) !== JSON.stringify(data.upiDetails) ||
                  JSON.stringify(prev.settlementHistory) !== JSON.stringify(data.settlementHistory) || 
                  JSON.stringify(prev.notifications) !== JSON.stringify(data.notifications)) {
                return { ...prev, ...data };
              }
              return prev;
            });
          }
        }
      } catch (err) { console.error("Error polling owner profile:", err); }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleLoginWithCredentials = async (emailOrPhone, password) => {
    const cleanInput = emailOrPhone.trim().toLowerCase().replace(/\s+/g, '');
    
    // Check if it's admin or customer credentials to show role restriction error
    const isAdmin = cleanInput === 'admin@parkeasy.in' || cleanInput === '+919876543210' || cleanInput === '9876543210';
    const isCustomer = cleanInput === 'karthik@mymail.com' || cleanInput === '+918883399999' || cleanInput === '8883399999';
    
    if (isAdmin) {
      throw new Error("This portal is restricted to Parking Hosts. Please log in at the Admin Console.");
    }
    if (isCustomer) {
      throw new Error("This portal is restricted to Parking Hosts. Please log in at the Customer App.");
    }
    
    try {
      const loginEmail = emailOrPhone.includes('@') ? emailOrPhone : `${cleanInput}@spotowner.com`;
      await signInWithEmailAndPassword(auth, loginEmail, password);
    } catch (e) {
      throw new Error(e.message || "Failed to log in with credentials.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Error signing out:", e);
    }
    setUser(null);
    localStorage.removeItem('parkeasy_owner');
  };

  // Owner user profile details
  const ownerProfile = user || {
    uid: "owner-456",
    name: "Suresh Perumal",
    email: "suresh@spotowner.com",
    phone: "+91 94440 12345",
    verified: true,
    gstin: "33AABCP8921J1Z0"
  };

  // Form states
  const [newLocName, setNewLocName] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [newLocDesc, setNewLocDesc] = useState('');
  const [newLocHourly, setNewLocHourly] = useState('');
  const [newLocDaily, setNewLocDaily] = useState('');
  const [newLoc2WSlots, setNewLoc2WSlots] = useState('');
  const [newLoc4WSlots, setNewLoc4WSlots] = useState('');
  const [newLocCCTV, setNewLocCCTV] = useState(true);
  const [newLocLat, setNewLocLat] = useState('');
  const [newLocLng, setNewLocLng] = useState('');
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [newLocImage, setNewLocImage] = useState('');
  const [focusedInput, setFocusedInput] = useState(null);

  // Profile Dashboard states
  const [profileSubTab, setProfileSubTab] = useState('overview');
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profilePic, setProfilePic] = useState(user?.profilePic || '');

  // Business states
  const [companyName, setCompanyName] = useState(user?.companyName || 'SpotPark Chennai Operations Ltd');
  const [companyGstin, setCompanyGstin] = useState(user?.gstin || '33AABCP8921J1Z0');
  const [companyAddress, setCompanyAddress] = useState(user?.companyAddress || '45, Cathedral Road, Chennai, Tamil Nadu, 600086');

  // Bank Payout states
  const [bankName, setBankName] = useState(user?.bankDetails?.bankName || user?.bankName || 'State Bank of India');
  const [bankAccNum, setBankAccNum] = useState(user?.bankDetails?.accountNumber || user?.bankAccNum || '330099441122');
  const [confirmBankAccNum, setConfirmBankAccNum] = useState(user?.bankDetails?.accountNumber || user?.bankAccNum || '330099441122');
  const [bankIfsc, setBankIfsc] = useState(user?.bankDetails?.ifscCode || user?.bankIfsc || 'SBIN0001234');
  const [bankHolder, setBankHolder] = useState(user?.bankDetails?.holderName || user?.bankHolder || user?.name || 'Suresh Perumal');
  const [bankBranch, setBankBranch] = useState(user?.bankDetails?.branchName || '');

  // UPI Payout states
  const [upiId, setUpiId] = useState(user?.upiDetails?.upiId || '');
  const [isUpiVerified, setIsUpiVerified] = useState(user?.upiDetails?.verifiedUpi || false);
  const [verifyingUpi, setVerifyingUpi] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState(user?.payoutMethod || 'bank');

  // Verification Documents (base64 URLs)
  const [cancelledCheque, setCancelledCheque] = useState(user?.kycDocuments?.cancelledCheque || '');
  const [passbook, setPassbook] = useState(user?.kycDocuments?.passbook || '');
  const [panCardDoc, setPanCardDoc] = useState(user?.kycDocuments?.panCard || '');

  // Edit & OTP Security states
  const [commissionRate, setCommissionRate] = useState(10);
  const [isEditingPayout, setIsEditingPayout] = useState(false);
  const [revealOwnerAccNum, setRevealOwnerAccNum] = useState(false);
  const [showBankDropdown, setShowBankDropdown] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [showBankDropdownProfile, setShowBankDropdownProfile] = useState(false);
  const [bankSearchQueryProfile, setBankSearchQueryProfile] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpCallback, setOtpCallback] = useState(null);
  const [showBookingOtpModal, setShowBookingOtpModal] = useState(false);
  const [bookingOtpInput, setBookingOtpInput] = useState('');
  const [bookingOtpError, setBookingOtpError] = useState('');
  const [selectedBookingForOtp, setSelectedBookingForOtp] = useState(null);

  // Security states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.security?.twoFactorEnabled || false);

  // Sync profile fields when user changes
  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileEmail(user.email || '');
      setProfilePhone(user.phone || '');
      setProfilePic(user.profilePic || '');
      setCompanyName(user.companyName || 'SpotPark Chennai Operations Ltd');
      setCompanyGstin(user.gstin || '33AABCP8921J1Z0');
      setCompanyAddress(user.companyAddress || '45, Cathedral Road, Chennai, Tamil Nadu, 600086');
      
      setPayoutMethod(user.payoutMethod || 'bank');
      setBankName(user.bankDetails?.bankName || user.bankName || 'State Bank of India');
      setBankAccNum(user.bankDetails?.accountNumber || user.bankAccNum || '330099441122');
      setConfirmBankAccNum(user.bankDetails?.accountNumber || user.bankAccNum || '330099441122');
      setBankIfsc(user.bankDetails?.ifscCode || user.bankIfsc || 'SBIN0001234');
      setBankHolder(user.bankDetails?.holderName || user.bankHolder || user.name || 'Suresh Perumal');
      setBankBranch(user.bankDetails?.branchName || '');
      
      setUpiId(user.upiDetails?.upiId || '');
      setIsUpiVerified(user.upiDetails?.verifiedUpi || false);
      
      setCancelledCheque(user.kycDocuments?.cancelledCheque || '');
      setPassbook(user.kycDocuments?.passbook || '');
      setPanCardDoc(user.kycDocuments?.panCard || '');
      
      setTwoFactorEnabled(user.security?.twoFactorEnabled || false);
    }
  }, [user]);

  const updateProfile = (newData) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...newData };
      localStorage.setItem('parkeasy_owner', JSON.stringify(updated));
      
      // Fire-and-forget sync to backend
      fetch(`${API_URL}/owners/${prev.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      }).catch(err => console.error("Error syncing profile to backend:", err));

      return updated;
    });
  };

  const handleSaveProfileChanges = (e) => {
    e.preventDefault();
    if (!profileName.trim()) {
      showAlert("Please enter your name.");
      return;
    }
    if (!profileEmail.trim()) {
      showAlert("Please enter your email.");
      return;
    }
    updateProfile({
      name: profileName,
      email: profileEmail,
      phone: profilePhone,
      profilePic: profilePic
    });
    showAlert("Profile changes saved successfully!", "Profile Updated");
  };

  const handleSaveBusinessDetails = (e) => {
    e.preventDefault();
    if (!companyName.trim()) {
      showAlert("Please enter company name.");
      return;
    }
    if (!companyGstin.trim()) {
      showAlert("Please enter GSTIN.");
      return;
    }
    updateProfile({
      companyName: companyName,
      gstin: companyGstin,
      companyAddress: companyAddress
    });
    showAlert("Business details saved successfully!", "Business Details");
  };

  const handleSaveBankDetails = (e) => {
    e.preventDefault();
    if (!bankName.trim() || !bankAccNum.trim() || !bankIfsc.trim() || !bankHolder.trim()) {
      showAlert("All bank fields are required.");
      return;
    }
    updateProfile({
      bankName,
      bankAccNum,
      bankIfsc,
      bankHolder
    });
    showAlert("Bank payout details updated successfully!", "Bank Details");
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (!oldPassword) {
      showAlert("Please enter your current password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      showAlert("Password must be at least 6 characters.");
      return;
    }
    showAlert("Your password has been changed successfully!", "Security Settings");
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewLocImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      showAlert("Geolocation is not supported by your browser.", "Error");
      return;
    }
    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setNewLocLat(latitude.toFixed(6));
        setNewLocLng(longitude.toFixed(6));

        // Reverse geocode using OpenStreetMap Nominatim
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();

          if (data && data.address) {
            const a = data.address;
            // Build a clean address string from available parts
            const parts = [
              a.road || a.pedestrian || a.footway,
              a.suburb || a.neighbourhood || a.quarter,
              a.city || a.town || a.village || a.county,
              a.state,
            ].filter(Boolean);
            const addressStr = parts.join(', ');
            setNewLocAddress(addressStr || data.display_name);
            showAlert(`📍 Location detected!\n${addressStr || data.display_name}`, "Location Auto-Filled");
          } else {
            showAlert(`Location detected: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n(Address lookup failed)`, "Location Detected");
          }
        } catch (geoErr) {
          console.error("Reverse geocoding error:", geoErr);
          showAlert(`Location detected: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n(Address lookup unavailable)`, "Location Detected");
        }

        setDetectingLoc(false);
      },
      (error) => {
        console.error("Error detecting location:", error);
        setDetectingLoc(false);
        showAlert("Failed to detect live location. Please check browser permissions.", "Permission Error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmitSupportTicket = (e) => {
    e.preventDefault();
    if (!supportSubject || !supportDesc) return;
    const ticket = {
      userId: ownerProfile.uid || 'owner-456',
      userName: ownerProfile.name || 'Suresh Perumal',
      userEmail: ownerProfile.email || 'suresh@spotowner.com',
      userRole: 'owner',
      subject: supportSubject,
      description: supportDesc,
      status: 'pending'
    };

    fetch(`${API_URL}/complaints`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticket)
    })
    .then(res => res.json())
    .then(savedTicket => {
      setComplaints(prev => [savedTicket, ...prev]);
      showAlert("Your support request has been submitted successfully.", "Ticket Submitted");
      setSupportSubject('');
      setSupportDesc('');
    })
    .catch(err => console.error("Error submitting support ticket:", err));
  };

  // Calculations
  const ownerLocs = locations.filter(l => l.ownerId === ownerProfile.uid);
  const ownerLocIds = ownerLocs.map(l => l.id);
  const isHostOnline = ownerLocs.some(loc => loc.status !== 'inactive');

  const toggleGlobalStatus = (nextOnline) => {
    const targetStatus = nextOnline ? 'active' : 'inactive';
    ownerLocs.forEach(loc => {
      fetch(`${API_URL}/locations/${loc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
      })
      .then(res => res.json())
      .then(updatedLoc => {
        setLocations(prev => prev.map(l => l.id === loc.id ? updatedLoc : l));
      })
      .catch(err => console.error("Error updating global status:", err));
    });
    showAlert(`Host is now ${nextOnline ? 'ONLINE' : 'OFFLINE'}. All slots are ${nextOnline ? 'visible' : 'hidden'} to users.`, "Status Updated");
  };
  const ownerBks = bookings.filter(b => ownerLocIds.includes(b.locationId));
  const totalEarnings = Math.max(
    ownerBks.reduce((sum, b) => b.status === 'completed' || b.status === 'active' ? sum + b.totalAmount : sum, 0),
    ownerProfile.earnings || 0
  );

  // Financial Dashboard Calculations
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  // Start of this week (Sunday)
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - now.getDay());
  const weekStart = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate()).getTime();
  
  // Start of this month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const getBookingTime = (b) => {
    return new Date(b.createdAt || b.bookingDate || b.startTime || Date.now()).getTime();
  };

  const activeAndCompletedBks = ownerBks.filter(b => b.status === 'completed' || b.status === 'active');

  // Earnings Categories
  const todayEarningsGross = activeAndCompletedBks
    .filter(b => getBookingTime(b) >= todayStart)
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const weekEarningsGross = activeAndCompletedBks
    .filter(b => getBookingTime(b) >= weekStart)
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const monthEarningsGross = activeAndCompletedBks
    .filter(b => getBookingTime(b) >= monthStart)
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const lifetimeEarningsGross = totalEarnings;

  // Bookings stats
  const totalBookingsCount = ownerBks.length;
  const averageBookingValue = totalBookingsCount > 0 ? Math.round(lifetimeEarningsGross / totalBookingsCount) : 0;

  // Settlements Settings (Dynamic Commission Split)
  const pendingSettlementAmt = Math.round(lifetimeEarningsGross * ((100 - commissionRate) / 100));
  const lastSettlementAmt = 5200; // Mock historical cycle
  const lastSettlementDate = "June 15, 2026";
  const nextSettlementDate = "June 30, 2026";
  const settlementStatus = "Scheduled";

  const handleAddLocation = (e) => {
    e.preventDefault();
    if (!newLocName || !newLocAddress) return;
    const newLoc = {
      ownerId: ownerProfile.uid,
      name: newLocName,
      address: newLocAddress,
      latitude: parseFloat(newLocLat) || 13.0405,
      longitude: parseFloat(newLocLng) || 80.2337,
      description: newLocDesc,
      rates: {
        halfHour: globalRates.halfHour,
        hourly: globalRates.hourly,
        daily: globalRates.daily
      },
      totalSlots: {
        twoWheeler: parseInt(newLoc2WSlots) || 40,
        fourWheeler: parseInt(newLoc4WSlots) || 20
      },
      availableSlots: {
        twoWheeler: parseInt(newLoc2WSlots) || 40,
        fourWheeler: parseInt(newLoc4WSlots) || 20
      },
      images: newLocImage ? [newLocImage] : ["https://images.unsplash.com/photo-1506521788723-85811181d4db?auto=format&fit=crop&q=80&w=400"],
      isApproved: true, // Auto-approved on creation so it shows immediately to users
      cctvEnabled: newLocCCTV
    };
    
    fetch(`${API_URL}/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLoc)
    })
    .then(res => res.json())
    .then(savedLoc => {
      setLocations(prev => [...prev, savedLoc]);
      showAlert("Parking listing has been submitted successfully.", "Listing Submitted");
      setNewLocName('');
      setNewLocAddress('');
      setNewLocDesc('');
      setNewLocHourly('');
      setNewLocDaily('');
      setNewLoc2WSlots('');
      setNewLoc4WSlots('');
      setNewLocLat('');
      setNewLocLng('');
      setNewLocImage('');
    })
    .catch(err => console.error("Error creating location:", err));
  };

  const handleDeleteLocation = (locId) => {
    if (!window.confirm("Are you sure you want to delete this parking location?")) return;

    fetch(`${API_URL}/locations/${locId}`, {
      method: 'DELETE'
    })
    .then(res => {
      if (res.ok) {
        setLocations(prev => prev.filter(l => l.id !== locId));
        showAlert("Parking location deleted successfully.", "Location Deleted");
      } else {
        throw new Error("Failed to delete location");
      }
    })
    .catch(err => {
      console.error("Error deleting location:", err);
      showAlert("Could not delete parking location. Please try again.", "Error");
    });
  };

  const handleManualOccupancy = (locId, type, increase) => {
    const loc = locations.find(l => l.id === locId);
    if (!loc) return;
    
    const currentVal = loc.availableSlots[type];
    const maxVal = loc.totalSlots[type];
    let newVal = increase ? currentVal + 1 : currentVal - 1;
    newVal = Math.max(0, Math.min(maxVal, newVal));

    const updatedSlots = {
      ...loc.availableSlots,
      [type]: newVal
    };

    fetch(`${API_URL}/locations/${locId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availableSlots: updatedSlots })
    })
    .then(res => res.json())
    .then(updatedLoc => {
      setLocations(prev => prev.map(l => l.id === locId ? updatedLoc : l));
      
      // Log audit
      fetch(`${API_URL}/audit-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin: ownerProfile.name,
          action: `Manual occupancy gate update at "${loc.name}": Available ${type} slots set to ${newVal}/${maxVal}`,
          type: 'parking'
        })
      }).catch(err => console.error("Error logging manual occupancy audit:", err));
    })
    .catch(err => console.error("Error updating manual occupancy:", err));
  };

  const handleApproveBooking = (bookingId, approve) => {
    const status = approve ? 'active' : 'cancelled';
    fetch(`${API_URL}/bookings/${bookingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    .then(res => res.json())
    .then(updatedBooking => {
      setBookings(prev => prev.map(b => b.id === bookingId ? updatedBooking : b));
      showAlert(approve ? "Booking has been approved!" : "Booking request rejected.", "Status Updated");
      
      // Fetch locations to refresh dynamic slot occupancy
      fetch(`${API_URL}/locations`)
        .then(res => res.json())
        .then(data => setLocations(data))
        .catch(err => console.error("Error refreshing locations after approval:", err));
    })
    .catch(err => console.error("Error updating booking status:", err));
  };

  const handleVerifyBookingWithOtp = (e) => {
    if (e) e.preventDefault();
    console.log("handleVerifyBookingWithOtp called with code:", bookingOtpInput);
    if (!bookingOtpInput.trim()) {
      setBookingOtpError("Please enter the 4-digit code.");
      return;
    }

    fetch(`${API_URL}/bookings/${selectedBookingForOtp.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        otpCode: bookingOtpInput.trim()
      })
    })
    .then(res => {
      if (!res.ok) {
        return res.json().then(err => { throw new Error(err.error || "Failed to verify booking"); });
      }
      return res.json();
    })
    .then(updatedBooking => {
      setBookings(prev => prev.map(b => b.id === selectedBookingForOtp.id ? updatedBooking : b));
      showAlert("Booking verified successfully! Cash payment completed.", "Booking Verified ✅");
      setShowBookingOtpModal(false);
      setBookingOtpInput('');
      setBookingOtpError('');
      setSelectedBookingForOtp(null);

      // Refresh locations
      fetch(`${API_URL}/locations`)
        .then(res => res.json())
        .then(data => setLocations(data))
        .catch(err => console.error("Error refreshing locations after cash verification:", err));
    })
    .catch(err => {
      console.error("Error verifying booking OTP:", err);
      setBookingOtpError(err.message || "Invalid verification code.");
    });
  };

  const handleBypassBookingOtp = (e) => {
    if (e) e.preventDefault();
    console.log("handleBypassBookingOtp called");
    if (!selectedBookingForOtp) return;
    
    fetch(`${API_URL}/bookings/${selectedBookingForOtp.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acceptCash: true
      })
    })
    .then(res => {
      if (!res.ok) {
        return res.json().then(err => { throw new Error(err.error || "Failed to verify booking"); });
      }
      return res.json();
    })
    .then(updatedBooking => {
      setBookings(prev => prev.map(b => b.id === selectedBookingForOtp.id ? updatedBooking : b));
      showAlert("Booking verified successfully! Cash payment completed manually.", "Booking Verified ✅");
      setShowBookingOtpModal(false);
      setBookingOtpInput('');
      setBookingOtpError('');
      setSelectedBookingForOtp(null);

      // Refresh locations
      fetch(`${API_URL}/locations`)
        .then(res => res.json())
        .then(data => setLocations(data))
        .catch(err => console.error("Error refreshing locations after cash verification:", err));
    })
    .catch(err => {
      console.error("Error bypassing booking OTP:", err);
      setBookingOtpError(err.message || "Failed to process manual cash collection.");
    });
  };

  const handleDocUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'cheque') setCancelledCheque(reader.result);
        if (type === 'passbook') setPassbook(reader.result);
        if (type === 'pan') setPanCardDoc(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVerifyUpiId = () => {
    if (!upiId) {
      showAlert("Please enter a UPI ID first.", "Validation Error");
      return;
    }
    setVerifyingUpi(true);
    setTimeout(() => {
      setVerifyingUpi(false);
      setIsUpiVerified(true);
      showAlert(`UPI ID "${upiId}" has been verified successfully.`, "Verification Successful");
    }, 1200);
  };

  const triggerPayoutSave = (e) => {
    e.preventDefault();
    if (payoutMethod === 'bank') {
      if (!bankHolder || !bankName || !bankAccNum || !confirmBankAccNum || !bankIfsc) {
        showAlert("Please fill out all required bank fields.", "Validation Error");
        return;
      }
      if (bankAccNum !== confirmBankAccNum) {
        showAlert("Account numbers do not match.", "Validation Error");
        return;
      }
      if (bankIfsc.length < 11) {
        showAlert("IFSC Code must be at least 11 characters.", "Validation Error");
        return;
      }
    } else {
      if (!upiId) {
        showAlert("Please enter a UPI ID.", "Validation Error");
        return;
      }
      if (!isUpiVerified) {
        showAlert("Please verify your UPI ID before saving.", "Verification Required");
        return;
      }
    }

    if (!passbook) {
      showAlert("Bank Passbook front page is required for verification.", "Documents Required");
      return;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    setOtpCode(code);
    setOtpInput('');
    setOtpError('');
    setShowOtpModal(true);
    showAlert(`🔒 SECURITY SMS GATEWAY:\nYour ParkHub verification OTP is: ${code}`, "OTP Code Sent");
  };

  const handleVerifyOtp = () => {
    if (otpInput.trim() === otpCode) {
      if (otpCallback) {
        otpCallback();
        setOtpCallback(null);
      } else {
        const updatedKyc = {
          payoutMethod,
          bankDetails: {
            holderName: bankHolder,
            bankName,
            accountNumber: bankAccNum,
            ifscCode: bankIfsc,
            branchName: bankBranch
          },
          upiDetails: {
            upiId,
            verifiedUpi: isUpiVerified
          },
          kycDocuments: {
            cancelledCheque: '',
            passbook,
            panCard: panCardDoc
          },
          kycStatus: 'pending',
          kycDate: new Date().toISOString(),
          kycRemarks: 'Payout details updated by owner. Verification pending.'
        };
        
        updateProfile(updatedKyc);
        setIsEditingPayout(false);
        
        const newNotif = {
          id: 'notif-' + Math.floor(Math.random() * 1000),
          text: 'Payout bank details updated. KYC status set to pending.',
          date: new Date().toISOString()
        };
        
        // Trigger updates and set notification
        setUser(prev => {
          if (!prev) return null;
          const final = { ...prev, ...updatedKyc, notifications: [newNotif, ...(prev.notifications || [])] };
          localStorage.setItem('parkeasy_owner', JSON.stringify(final));
          return final;
        });

        showAlert("Payout settings saved successfully! Documents submitted for verification.", "Success ✅");
      }
      setShowOtpModal(false);
    } else {
      setOtpError("Invalid verification code. Please check and try again.");
    }
  };

  if (!user) {
    return <LoginScreen onLogin={handleLoginWithCredentials} onGoogleLogin={async () => { await signInWithPopup(auth, googleProvider); }} roleHint="Parking Host" />;
  }

  return (
    <div className="dashboard-grid" style={{ 
      display: 'grid', 
      gridTemplateColumns: isMobile ? '1fr' : '250px 1fr', 
      minHeight: '100vh',
      width: '100vw',
      overflowX: 'hidden'
    }}>
      {/* Mobile Top Header */}
      {isMobile && (
        <header style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: 'rgba(10, 8, 16, 0.9)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(123, 97, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          zIndex: 99
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(123,97,255,0.3)' }}>
              <img src="/parkhub_logo_owner.png" alt="ParkHub Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{ fontSize: '21px', fontWeight: '800', fontFamily: "'Space Grotesk', sans-serif" }}>
              <span style={{ color: '#FFF' }}>Park</span><span style={{ color: '#7B61FF' }}>Hub</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => toggleGlobalStatus(!isHostOnline)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '20px',
                border: '1px solid ' + (isHostOnline ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'),
                background: isHostOnline ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: isHostOnline ? '#10B981' : '#EF4444',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '700',
                transition: 'all 0.3s ease'
              }}
            >
              <span style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: isHostOnline ? '#10B981' : '#EF4444',
                display: 'inline-block'
              }} />
              <span>{isHostOnline ? 'Online' : 'Offline'}</span>
            </button>
          </div>
        </header>
      )}

      {/* Desktop Sidebar Navigation */}
      {!isMobile && (
        <aside style={{ background: 'linear-gradient(180deg, #0A0810 0%, #10091A 100%)', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid rgba(123,97,255,0.10)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(123,97,255,0.3), 0 0 24px rgba(0,212,255,0.1)' }}>
                  <img src="/parkhub_logo_owner.png" alt="ParkHub Owner Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <span style={{ fontSize: '18px', fontWeight: '800', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.5px' }}>
                  <span style={{ color: '#FFF' }}>Park</span><span style={{ color: '#7B61FF' }}>Hub</span>
                </span>
              </div>
              
              <button
                onClick={() => toggleGlobalStatus(!isHostOnline)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: '1px solid ' + (isHostOnline ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'),
                  background: isHostOnline ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  color: isHostOnline ? '#10B981' : '#EF4444',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '11px',
                  fontFamily: "'Space Grotesk', sans-serif",
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  boxShadow: isHostOnline ? '0 0 10px rgba(16,185,129,0.2)' : 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isHostOnline ? '#10B981' : '#EF4444',
                  boxShadow: isHostOnline ? '0 0 8px #10B981' : 'none',
                  display: 'inline-block'
                }} />
                <span>{isHostOnline ? 'Online' : 'Offline'}</span>
              </button>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[
                { id: 'overview', icon: <Activity size={17} />, label: 'Earnings Overview' },
                { id: 'add', icon: <Plus size={17} />, label: 'List Space' },
                { id: 'manage', icon: <MapPin size={17} />, label: 'Occupancy Controls' },
                { id: 'bookings', icon: <FileText size={17} />, label: 'Active Bookings' },
                { id: 'payout', icon: <CreditCard size={17} />, label: 'Payout Settings' },
                { id: 'payout-history', icon: <History size={17} />, label: 'Payout History' },
                { id: 'profile', icon: <User size={17} />, label: 'Profile' },
                { id: 'support', icon: <HelpCircle size={17} />, label: 'Help & Support' },
              ].map(item => (
                <button key={item.id} onClick={() => setCurrentTab(item.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 14px',
                  borderRadius: '10px', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: '600', fontSize: '13px',
                  background: currentTab === item.id ? 'rgba(123,97,255,0.10)' : 'transparent',
                  color: currentTab === item.id ? '#A78BFA' : '#8B9AC4',
                  borderLeft: currentTab === item.id ? '3px solid #7B61FF' : '3px solid transparent',
                  transition: 'all 0.2s ease'
                }}>
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '12px', background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.08)', marginBottom: '12px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg, #7B61FF, #00D4FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', color: '#fff', flexShrink: 0 }}>
                {ownerProfile.name ? ownerProfile.name.charAt(0).toUpperCase() : 'H'}
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#F0F4FF' }}>{ownerProfile.name}</p>
                <p style={{ fontSize: '9px', color: '#00D4FF', fontWeight: '600' }}>✓ GSTIN VERIFIED</p>
              </div>
            </div>

            <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,51,102,0.2)', background: 'rgba(255,51,102,0.06)', color: '#FF3366', cursor: 'pointer', fontWeight: '600', fontSize: '12px', transition: 'all 0.2s ease' }}>
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </aside>
      )}

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '65px',
          background: 'rgba(10, 8, 16, 0.95)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(123, 97, 255, 0.15)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 99,
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}>
          {[
            { id: 'overview', icon: <Activity size={18} />, label: 'Overview' },
            { id: 'add', icon: <Plus size={18} />, label: 'List' },
            { id: 'manage', icon: <MapPin size={18} />, label: 'Occupancy' },
            { id: 'bookings', icon: <FileText size={18} />, label: 'Bookings' },
            { id: 'profile', icon: <User size={18} />, label: 'Profile' }
          ].map(item => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'transparent',
                  border: 'none',
                  color: isActive ? '#A78BFA' : '#8B9AC4',
                  cursor: 'pointer',
                  padding: '4px 0',
                  width: '20%',
                  gap: '4px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  color: isActive ? '#A78BFA' : '#8B9AC4',
                  transform: isActive ? 'scale(1.15)' : 'scale(1)',
                  transition: 'transform 0.2s'
                }}>
                  {item.icon}
                </div>
                <span style={{ fontSize: '10px', fontWeight: isActive ? '700' : '500' }}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* 2. Main Content Area */}
      <main style={{ 
        padding: isMobile ? '16px' : '32px', 
        overflowY: 'auto', 
        maxHeight: isMobile ? 'calc(100vh - 125px)' : '100vh',
        marginTop: isMobile ? '60px' : '0',
        paddingBottom: isMobile ? '90px' : '32px'
      }}>
        
        {currentTab === 'overview' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '60px' }}>
            

            {/* 2. Earnings Overview Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              {[
                { label: "Today's Earnings", value: `₹${todayEarningsGross}`, desc: "Active & completed today", icon: <Clock size={18} color="#A78BFA" />, border: '#7B61FF', textCol: '#A78BFA' },
                { label: "This Week's Earnings", value: `₹${weekEarningsGross}`, desc: "Rolling 7 days total", icon: <Activity size={18} color="#60A5FA" />, border: '#00D4FF', textCol: '#60A5FA' },
                { label: "This Month's Earnings", value: `₹${monthEarningsGross}`, desc: "June billing cycle", icon: <FileText size={18} color="#FBBF24" />, border: '#FF8C42', textCol: '#FBBF24' },
                { label: "Total Lifetime Earnings", value: `₹${lifetimeEarningsGross}`, desc: "Gross platform intake", icon: <DollarSign size={18} color="#34D399" />, border: '#00E5A0', textCol: '#34D399' }
              ].map((card, i) => (
                <div key={i} className="glass-panel" style={{ 
                  padding: '24px 20px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px', 
                  textAlign: 'left',
                  borderTop: `3px solid ${card.border}`,
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.005) 100%)',
                  boxShadow: `0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.05)`,
                  borderRadius: '12px',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  cursor: 'default'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{card.label}</span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: `1px solid ${card.border}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {card.icon}
                    </div>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '28px', fontWeight: '800', color: card.textCol, margin: '0', fontFamily: "'Space Grotesk', sans-serif" }}>{card.value}</h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '6px 0 0 0', fontWeight: '500' }}>{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 3. Settlement Details & Commission Split */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr', gap: '24px' }}>
              
              {/* Settlements Summary Card */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left', background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#FFF', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', margin: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🏦 Settlement Payout Destination
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Pending Payout ({100 - commissionRate}%)</span>
                    <span style={{ color: '#00E5A0', fontSize: '22px', fontWeight: '800' }}>₹{pendingSettlementAmt}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Next Payout Date</span>
                    <span style={{ color: '#FFF', fontSize: '15px', fontWeight: 'bold' }}>{nextSettlementDate}</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px', borderTop: '1px dashed var(--border-color)', paddingTop: '16px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Last Payout Date</span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>{lastSettlementDate}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '4px' }}>Last Payout Amount</span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>₹{lastSettlementAmt}</span>
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: '#FFF', fontWeight: 'bold', display: 'block' }}>{user?.bankName || 'State Bank of India'}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Acc: •••• {user?.bankAccNum?.slice(-4) || '1234'}</span>
                  </div>
                  <span style={{ color: '#00E5A0', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.2)', padding: '3px 8px', borderRadius: '4px' }}>Verified</span>
                </div>
              </div>

              {/* Commission Split breakdown */}
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left', background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#FFF', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', margin: '0' }}>
                  💵 Platform Commission Breakdown
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Total Revenue Collected (100%):</span>
                    <span style={{ color: '#FFF', fontWeight: 'bold' }}>₹{lifetimeEarningsGross}</span>
                  </div>
                  
                  {/* Visual Progress Bar */}
                  <div style={{ margin: '8px 0' }}>
                    <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
                      <div style={{ width: `${100 - commissionRate}%`, background: 'linear-gradient(90deg, #00D4FF, #00E5A0)' }} title="Net Payout to Host" />
                      <div style={{ width: `${commissionRate}%`, background: '#FF3366' }} title="Platform Commission" />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', fontWeight: '600' }}>
                      <span style={{ color: '#00E5A0' }}>Host Settlement: {100 - commissionRate}%</span>
                      <span style={{ color: '#FF3366' }}>ParkHub Fee: {commissionRate}%</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>ParkHub Commission ({commissionRate}%):</span>
                    <span style={{ color: '#FF3366', fontWeight: 'bold' }}>- ₹{Math.round(lifetimeEarningsGross * (commissionRate / 100))}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderTop: '1px dashed var(--border-color)', paddingTop: '12px' }}>
                    <span style={{ color: '#FFF', fontWeight: 'bold' }}>Net Host Settlement ({100 - commissionRate}%):</span>
                    <span style={{ color: '#00E5A0', fontSize: '16px', fontWeight: '800', fontFamily: "'Space Grotesk', sans-serif" }}>₹{pendingSettlementAmt}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.12)', padding: '12px', borderRadius: '10px', gap: '8px' }}>
                  <span>ℹ️</span>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '0', lineHeight: '1.4' }}>
                    Fees are calculated automatically on active and completed bookings. Commission is held for platform maintenance.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentTab === 'add' && (
          <div className="animate-fade-in" style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '40px' }}>
            <div className="glass-panel" style={{ padding: '32px' }}>
              
              {/* Header */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px', 
                borderBottom: '1px solid rgba(0, 212, 255, 0.1)', 
                paddingBottom: '20px', 
                marginBottom: '28px' 
              }}>
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(123, 97, 255, 0.15) 100%)',
                  border: '1px solid rgba(0, 212, 255, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00D4FF',
                  boxShadow: '0 0 15px rgba(0, 212, 255, 0.1)'
                }}>
                  <Plus size={22} style={{ strokeWidth: 2.5 }} />
                </div>
                <div>
                  <h2 style={{ 
                    fontSize: '22px', 
                    fontWeight: '800', 
                    background: 'linear-gradient(90deg, #FFF 0%, var(--text-secondary) 100%)', 
                    WebkitBackgroundClip: 'text', 
                    WebkitTextFillColor: 'transparent',
                    margin: '0 0 2px 0'
                  }}>
                    List a New Parking Space
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                    Register and configure a new parking asset on the SpotPark platform.
                  </p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleAddLocation} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Two Column Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                  gap: '32px'
                }}>
                  
                  {/* Left Column: Media, Rates, CCTV */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* Media Upload */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Parking Space Photo
                      </label>
                      {newLocImage ? (
                        <div style={{ position: 'relative', width: '100%', height: '200px', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(0, 212, 255, 0.2)' }}>
                          <img src={newLocImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.85) 100%)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '16px' }}>
                            <span style={{ fontSize: '12px', color: '#FFF', fontWeight: '600' }}>Preview Ready</span>
                            <button 
                              type="button" 
                              onClick={() => setNewLocImage('')} 
                              style={{ 
                                background: 'rgba(255, 23, 68, 0.9)', 
                                color: '#FFF', 
                                border: 'none', 
                                borderRadius: '6px', 
                                padding: '6px 12px', 
                                fontSize: '11px', 
                                cursor: 'pointer',
                                fontWeight: '700',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#FF1744'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 23, 68, 0.9)'}
                            >
                              <XCircle size={12} /> Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          border: '2px dashed rgba(0, 212, 255, 0.25)',
                          borderRadius: '14px',
                          padding: '40px 20px',
                          textAlign: 'center',
                          background: 'rgba(10, 18, 38, 0.4)',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.3s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxSizing: 'border-box',
                          minHeight: '200px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#00D4FF';
                          e.currentTarget.style.background = 'rgba(0, 212, 255, 0.03)';
                          e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.25)';
                          e.currentTarget.style.background = 'rgba(10, 18, 38, 0.4)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        >
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                            style={{
                              position: 'absolute',
                              inset: 0,
                              opacity: 0,
                              cursor: 'pointer',
                              width: '100%',
                              height: '100%'
                            }} 
                          />
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'rgba(0, 212, 255, 0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '12px'
                          }}>
                            <Camera size={22} color="var(--primary)" />
                          </div>
                          <p style={{ fontSize: '13px', color: '#FFF', fontWeight: '600', margin: '0' }}>Click or Drag photo to upload</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', margin: '0' }}>Supports PNG, JPG, GIF up to 5MB</p>
                        </div>
                      )}
                    </div>

                    {/* Platform Rates Info */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Platform Base Rates
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        {[
                          { label: '30 Mins', value: globalRates.halfHour },
                          { label: 'Hourly', value: globalRates.hourly },
                          { label: 'Daily', value: globalRates.daily }
                        ].map((rate, idx) => (
                          <div key={idx} style={{
                            background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.05) 0%, rgba(255, 152, 0, 0.02) 100%)',
                            border: '1px solid rgba(255, 193, 7, 0.25)',
                            borderRadius: '12px',
                            padding: '14px 10px',
                            textAlign: 'center',
                            position: 'relative'
                          }}>
                            <span style={{
                              position: 'absolute',
                              top: '-8px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              fontSize: '8px',
                              fontWeight: '800',
                              background: '#FFC107',
                              color: '#000',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              textTransform: 'uppercase'
                            }}>Admin</span>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', marginTop: '2px' }}>{rate.label}</div>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#FFC107', marginTop: '4px' }}>₹{rate.value}</div>
                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                              <Lock size={8} /> Fixed
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        background: 'rgba(255, 193, 7, 0.05)',
                        border: '1px solid rgba(255, 193, 7, 0.12)',
                        borderRadius: '10px',
                        padding: '10px 12px'
                      }}>
                        <Info size={14} color="#FFC107" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <p style={{ fontSize: '11px', color: 'rgba(255,193,7,0.85)', margin: 0, lineHeight: '1.4' }}>
                          Rates are managed centrally by the platform admin to ensure consistent pricing rules across all active locations.
                        </p>
                      </div>
                    </div>

                    {/* Amenities Toggle */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Safety & Facilities
                      </label>
                      <div 
                        onClick={() => setNewLocCCTV(!newLocCCTV)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: newLocCCTV ? 'rgba(0, 229, 160, 0.08)' : 'rgba(10, 18, 38, 0.4)',
                          border: newLocCCTV ? '1px solid rgba(0, 229, 160, 0.4)' : '1px solid rgba(0, 212, 255, 0.1)',
                          borderRadius: '12px',
                          padding: '14px 16px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: newLocCCTV ? 'rgba(0, 229, 160, 0.2)' : 'rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: newLocCCTV ? '#00E5A0' : 'var(--text-muted)',
                            transition: 'all 0.3s ease'
                          }}>
                            <Camera size={16} />
                          </div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: newLocCCTV ? '#FFF' : 'var(--text-secondary)' }}>CCTV Surveillance</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Active 24/7 security monitoring</div>
                          </div>
                        </div>
                        {/* Custom Toggle Switch */}
                        <div style={{
                          width: '40px',
                          height: '22px',
                          borderRadius: '99px',
                          background: newLocCCTV ? '#00E5A0' : 'rgba(255,255,255,0.1)',
                          position: 'relative',
                          transition: 'all 0.3s ease'
                        }}>
                          <div style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: '#FFF',
                            position: 'absolute',
                            top: '3px',
                            left: newLocCCTV ? '21px' : '3px',
                            transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.27, 1.55)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                          }} />
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Address and Specifics */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    
                    {/* Parking Name */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Parking Space Name
                      </label>
                      <input 
                        type="text" 
                        value={newLocName} 
                        onChange={(e) => setNewLocName(e.target.value)} 
                        placeholder="e.g. Mylapore Central Car Spot" 
                        onFocus={() => setFocusedInput('name')}
                        onBlur={() => setFocusedInput(null)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          background: 'rgba(10, 18, 38, 0.7)',
                          border: focusedInput === 'name' ? '1px solid var(--primary)' : '1px solid rgba(0, 212, 255, 0.15)',
                          boxShadow: focusedInput === 'name' ? '0 0 12px rgba(0, 212, 255, 0.2)' : 'none',
                          borderRadius: '10px',
                          color: '#FFF',
                          fontSize: '14px',
                          fontFamily: 'var(--font-main)',
                          transition: 'all 0.3s ease',
                          outline: 'none'
                        }} 
                        required 
                      />
                    </div>

                    {/* Address */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                          Street Address
                        </label>
                        <button 
                          type="button" 
                          onClick={handleDetectLocation} 
                          disabled={detectingLoc}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            padding: 0,
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#FFF'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--primary)'}
                        >
                          {detectingLoc ? (
                            <>
                              <RefreshCw size={12} className="spinning" />
                              <span>Detecting...</span>
                            </>
                          ) : (
                            <>
                              <Compass size={12} />
                              <span>Detect Live Location</span>
                            </>
                          )}
                        </button>
                      </div>
                      <input 
                        type="text" 
                        value={newLocAddress} 
                        onChange={(e) => setNewLocAddress(e.target.value)} 
                        placeholder="Street name, landmark, Chennai" 
                        onFocus={() => setFocusedInput('address')}
                        onBlur={() => setFocusedInput(null)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          background: 'rgba(10, 18, 38, 0.7)',
                          border: focusedInput === 'address' ? '1px solid var(--primary)' : '1px solid rgba(0, 212, 255, 0.15)',
                          boxShadow: focusedInput === 'address' ? '0 0 12px rgba(0, 212, 255, 0.2)' : 'none',
                          borderRadius: '10px',
                          color: '#FFF',
                          fontSize: '14px',
                          fontFamily: 'var(--font-main)',
                          transition: 'all 0.3s ease',
                          outline: 'none'
                        }} 
                        required 
                      />
                    </div>

                    {/* Coordinates Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Latitude
                        </label>
                        <input 
                          type="number" 
                          step="any" 
                          value={newLocLat} 
                          onChange={(e) => setNewLocLat(e.target.value)} 
                          placeholder="e.g. 13.0405" 
                          onFocus={() => setFocusedInput('lat')}
                          onBlur={() => setFocusedInput(null)}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            background: 'rgba(10, 18, 38, 0.7)',
                            border: focusedInput === 'lat' ? '1px solid var(--primary)' : '1px solid rgba(0, 212, 255, 0.15)',
                            boxShadow: focusedInput === 'lat' ? '0 0 12px rgba(0, 212, 255, 0.2)' : 'none',
                            borderRadius: '10px',
                            color: '#FFF',
                            fontSize: '14px',
                            fontFamily: 'var(--font-main)',
                            transition: 'all 0.3s ease',
                            outline: 'none'
                          }} 
                          required 
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Longitude
                        </label>
                        <input 
                          type="number" 
                          step="any" 
                          value={newLocLng} 
                          onChange={(e) => setNewLocLng(e.target.value)} 
                          placeholder="e.g. 80.2337" 
                          onFocus={() => setFocusedInput('lng')}
                          onBlur={() => setFocusedInput(null)}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            background: 'rgba(10, 18, 38, 0.7)',
                            border: focusedInput === 'lng' ? '1px solid var(--primary)' : '1px solid rgba(0, 212, 255, 0.15)',
                            boxShadow: focusedInput === 'lng' ? '0 0 12px rgba(0, 212, 255, 0.2)' : 'none',
                            borderRadius: '10px',
                            color: '#FFF',
                            fontSize: '14px',
                            fontFamily: 'var(--font-main)',
                            transition: 'all 0.3s ease',
                            outline: 'none'
                          }} 
                          required 
                        />
                      </div>
                    </div>

                    {/* Capacity Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          2-Wheeler Capacity
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input 
                            type="number" 
                            value={newLoc2WSlots} 
                            onChange={(e) => setNewLoc2WSlots(e.target.value)} 
                            placeholder="e.g. 20" 
                            onFocus={() => setFocusedInput('2w')}
                            onBlur={() => setFocusedInput(null)}
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              background: 'rgba(10, 18, 38, 0.7)',
                              border: focusedInput === '2w' ? '1px solid var(--primary)' : '1px solid rgba(0, 212, 255, 0.15)',
                              boxShadow: focusedInput === '2w' ? '0 0 12px rgba(0, 212, 255, 0.2)' : 'none',
                              borderRadius: '10px',
                              color: '#FFF',
                              fontSize: '14px',
                              fontFamily: 'var(--font-main)',
                              transition: 'all 0.3s ease',
                              outline: 'none'
                            }} 
                            required 
                          />
                          <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Slots</span>
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          4-Wheeler Capacity
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input 
                            type="number" 
                            value={newLoc4WSlots} 
                            onChange={(e) => setNewLoc4WSlots(e.target.value)} 
                            placeholder="e.g. 15" 
                            onFocus={() => setFocusedInput('4w')}
                            onBlur={() => setFocusedInput(null)}
                            style={{
                              width: '100%',
                              padding: '12px 14px',
                              background: 'rgba(10, 18, 38, 0.7)',
                              border: focusedInput === '4w' ? '1px solid var(--primary)' : '1px solid rgba(0, 212, 255, 0.15)',
                              boxShadow: focusedInput === '4w' ? '0 0 12px rgba(0, 212, 255, 0.2)' : 'none',
                              borderRadius: '10px',
                              color: '#FFF',
                              fontSize: '14px',
                              fontFamily: 'var(--font-main)',
                              transition: 'all 0.3s ease',
                              outline: 'none'
                            }} 
                            required 
                          />
                          <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Slots</span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Description & Guidelines
                      </label>
                      <textarea 
                        value={newLocDesc} 
                        onChange={(e) => setNewLocDesc(e.target.value)} 
                        placeholder="Operating details, landmarks, safety details..." 
                        onFocus={() => setFocusedInput('desc')}
                        onBlur={() => setFocusedInput(null)}
                        style={{
                          width: '100%',
                          height: '92px',
                          padding: '12px 14px',
                          background: 'rgba(10, 18, 38, 0.7)',
                          border: focusedInput === 'desc' ? '1px solid var(--primary)' : '1px solid rgba(0, 212, 255, 0.15)',
                          boxShadow: focusedInput === 'desc' ? '0 0 12px rgba(0, 212, 255, 0.2)' : 'none',
                          borderRadius: '10px',
                          color: '#FFF',
                          fontSize: '14px',
                          fontFamily: 'var(--font-main)',
                          transition: 'all 0.3s ease',
                          outline: 'none',
                          resize: 'none'
                        }} 
                      />
                    </div>

                  </div>

                </div>

                {/* Bottom Submit Button */}
                <div style={{ 
                  borderTop: '1px solid rgba(0, 212, 255, 0.1)', 
                  paddingTop: '20px', 
                  marginTop: '12px',
                  display: 'flex',
                  justifyContent: 'flex-end'
                }}>
                  <button 
                    type="submit" 
                    className="glow-button" 
                    style={{ 
                      minWidth: '220px', 
                      padding: '14px 28px',
                      fontSize: '14px',
                      fontWeight: '700',
                      letterSpacing: '0.5px'
                    }}
                  >
                    Submit Property Listing
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

        {currentTab === 'manage' && (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '24px' }}>Occupancy Controllers</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {ownerLocs.map(loc => (
                <div key={loc.id} className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{loc.name}</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', background: loc.isApproved ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 23, 68, 0.1)', color: loc.isApproved ? 'var(--primary)' : 'var(--accent-occupied)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        {loc.isApproved ? 'APPROVED' : 'PENDING'}
                      </span>
                      <button 
                        onClick={() => handleDeleteLocation(loc.id)} 
                        style={{ 
                          background: 'rgba(255, 23, 68, 0.1)', 
                          border: 'none', 
                          color: 'var(--accent-occupied)', 
                          padding: '6px', 
                          borderRadius: '6px', 
                          cursor: 'pointer', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          transition: 'all 0.2s'
                        }}
                        title="Delete Location"
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 23, 68, 0.2)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 23, 68, 0.1)'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>🏍️ 2-Wheeler Available</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                        <button onClick={() => handleManualOccupancy(loc.id, 'twoWheeler', false)} style={{ width: '28px', height: '28px', background: 'var(--bg-tertiary)', border: 'none', color: '#FFF', borderRadius: '4px', cursor: 'pointer' }}>-</button>
                        <span style={{ fontWeight: 'bold' }}>{loc.availableSlots.twoWheeler} / {loc.totalSlots.twoWheeler}</span>
                        <button onClick={() => handleManualOccupancy(loc.id, 'twoWheeler', true)} style={{ width: '28px', height: '28px', background: 'var(--bg-tertiary)', border: 'none', color: '#FFF', borderRadius: '4px', cursor: 'pointer' }}>+</button>
                      </div>
                    </div>

                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>🚗 4-Wheeler Available</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                        <button onClick={() => handleManualOccupancy(loc.id, 'fourWheeler', false)} style={{ width: '28px', height: '28px', background: 'var(--bg-tertiary)', border: 'none', color: '#FFF', borderRadius: '4px', cursor: 'pointer' }}>-</button>
                        <span style={{ fontWeight: 'bold' }}>{loc.availableSlots.fourWheeler} / {loc.totalSlots.fourWheeler}</span>
                        <button onClick={() => handleManualOccupancy(loc.id, 'fourWheeler', true)} style={{ width: '28px', height: '28px', background: 'var(--bg-tertiary)', border: 'none', color: '#FFF', borderRadius: '4px', cursor: 'pointer' }}>+</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentTab === 'bookings' && (
          <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '24px' }}>Platform Bookings Ledger</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {ownerBks.map(bk => (
                <div key={bk.id} className="glass-panel" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 'bold' }}>Booking ID: {bk.id}</h4>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Vehicle Plate: {bk.vehicleNumber} ({bk.vehicleType === 'four-wheeler' ? '4-wheeler' : '2-wheeler'})</p>
                    </div>
                    <span style={{ fontSize: '11px', background: 'var(--primary-glow)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{bk.status.toUpperCase()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '13px' }}>Gross paid: <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>₹{bk.totalAmount}</span></p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {bk.status === 'pending' && (
                        <>
                          <button onClick={() => handleApproveBooking(bk.id, true)} style={{ padding: '6px 12px', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Approve</button>
                          <button onClick={() => handleApproveBooking(bk.id, false)} style={{ padding: '6px 12px', background: 'rgba(255,23,68,0.1)', color: '#FF1744', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Reject</button>
                        </>
                      )}
                      {bk.status === 'active' && bk.paymentMethod === 'cash' && bk.paymentStatus === 'pending' && (
                        <button 
                          onClick={() => {
                            setSelectedBookingForOtp(bk);
                            setBookingOtpInput('');
                            setBookingOtpError('');
                            setShowBookingOtpModal(true);
                          }} 
                          style={{ 
                            padding: '8px 16px', 
                            background: 'var(--primary)', 
                            color: '#000', 
                            border: 'none', 
                            borderRadius: '6px', 
                            cursor: 'pointer', 
                            fontWeight: 'bold', 
                            fontSize: '12px' 
                          }}
                        >
                          Verify OTP & Checkout
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentTab === 'support' && (
          <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '28px' }}>
              
              {/* Left Column: Create Ticket */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: '#FFF' }}>Help & Support</h3>
                <form onSubmit={handleSubmitSupportTicket} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase' }}>Subject</label>
                    <input 
                      type="text" 
                      value={supportSubject} 
                      onChange={(e) => setSupportSubject(e.target.value)} 
                      placeholder="e.g., Booking discrepancy, Payout issue" 
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(10, 18, 38, 0.7)',
                        border: '1px solid rgba(0, 212, 255, 0.15)',
                        borderRadius: '8px',
                        color: '#FFF',
                        outline: 'none'
                      }} 
                      required 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase' }}>Details / Description</label>
                    <textarea 
                      value={supportDesc} 
                      onChange={(e) => setSupportDesc(e.target.value)} 
                      placeholder="Please explain the issue you are experiencing..." 
                      style={{
                        width: '100%',
                        height: '120px',
                        padding: '10px 12px',
                        background: 'rgba(10, 18, 38, 0.7)',
                        border: '1px solid rgba(0, 212, 255, 0.15)',
                        borderRadius: '8px',
                        color: '#FFF',
                        resize: 'none',
                        outline: 'none'
                      }} 
                      required 
                    />
                  </div>
                  <button type="submit" className="glow-button" style={{ width: '100%', padding: '12px' }}>Submit Support Ticket</button>
                </form>
              </div>

              {/* Right Column: Past Tickets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '4px', color: '#FFF' }}>Your Support Tickets</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Track the status of your current and resolved support inquiries.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                  {complaints.filter(c => c.userId === ownerProfile.uid || c.userId === 'owner-456').length === 0 ? (
                    <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No support tickets raised yet.
                    </div>
                  ) : (
                    complaints
                      .filter(c => c.userId === ownerProfile.uid || c.userId === 'owner-456')
                      .map(comp => (
                        <div key={comp.id} className="glass-panel" style={{ padding: '16px', borderLeft: comp.status === 'resolved' ? '4px solid #00E5A0' : '4px solid #FF8C42' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold' }}>ID: #{comp.id}</span>
                              <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#FFF', margin: '2px 0 0 0' }}>{comp.subject}</h4>
                            </div>
                            <span style={{
                              fontSize: '9px',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: comp.status === 'resolved' ? 'rgba(0, 229, 160, 0.12)' : 'rgba(255, 140, 66, 0.12)',
                              color: comp.status === 'resolved' ? '#00E5A0' : '#FF8C42'
                            }}>
                              {comp.status === 'resolved' ? 'Resolved' : 'Pending'}
                            </span>
                          </div>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: '1.4' }}>{comp.description}</p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: 'var(--text-muted)' }}>
                            <span>Submitted: {new Date(comp.createdAt).toLocaleDateString()}</span>
                            {comp.status === 'resolved' && (
                              <span style={{ color: '#00E5A0', fontWeight: '600' }}>✓ Resolved by Admin</span>
                            )}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {currentTab === 'payout' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '60px' }}>
            
            {/* 1. Verification Status Banner */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {user?.kycStatus === 'verified' && (
                <div className="glass-panel" style={{
                  background: 'linear-gradient(90deg, rgba(0, 229, 160, 0.08) 0%, rgba(0, 212, 255, 0.03) 100%)',
                  border: '1px solid rgba(0, 229, 160, 0.25)',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(0, 229, 160, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00E5A0', flexShrink: 0 }}>
                      <CheckCircle size={22} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#FFF', margin: '0' }}>KYC Payout Account Verified</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                        Your payout bank credentials have been approved by administration. Weekly settlements are active.
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ fontSize: '9px', fontWeight: '800', background: 'rgba(0, 229, 160, 0.12)', color: '#00E5A0', padding: '4px 10px', borderRadius: '20px', letterSpacing: '0.5px' }}>VERIFIED</span>
                    {user.kycDate && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Verified: {new Date(user.kycDate).toLocaleDateString()}</span>}
                  </div>
                </div>
              )}

              {user?.kycStatus === 'pending' && (
                <div className="glass-panel" style={{
                  background: 'linear-gradient(90deg, rgba(255, 140, 66, 0.08) 0%, rgba(0, 212, 255, 0.03) 100%)',
                  border: '1px solid rgba(255, 140, 66, 0.25)',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(255, 140, 66, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF8C42', flexShrink: 0 }}>
                      <Clock size={22} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#FFF', margin: '0' }}>KYC Verification Pending</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                        Your uploaded bank verification documents are currently under review by our admin operations team.
                      </p>
                    </div>
                  </div>
                  <span style={{ fontSize: '9px', fontWeight: '800', background: 'rgba(255, 140, 66, 0.12)', color: '#FF8C42', padding: '4px 10px', borderRadius: '20px', letterSpacing: '0.5px' }}>PENDING VERIFICATION</span>
                </div>
              )}

              {user?.kycStatus === 'rejected' && (
                <div className="glass-panel" style={{
                  background: 'linear-gradient(90deg, rgba(255, 51, 102, 0.08) 0%, rgba(0, 212, 255, 0.03) 100%)',
                  border: '1px solid rgba(255, 51, 102, 0.25)',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(255, 51, 102, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF3366', flexShrink: 0 }}>
                      <XCircle size={22} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#FFF', margin: '0' }}>Payout Account Verification Rejected</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                        <strong>Reason:</strong> {user.kycRemarks || 'Invalid document uploads. Please upload a clear cancelled cheque.'}
                      </p>
                    </div>
                  </div>
                  <span style={{ fontSize: '9px', fontWeight: '800', background: 'rgba(255, 51, 102, 0.12)', color: '#FF3366', padding: '4px 10px', borderRadius: '20px', letterSpacing: '0.5px' }}>REJECTED</span>
                </div>
              )}
            </div>

            {/* 2. Main Payout Content Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '28px', alignItems: 'start' }}>
              
              {/* Left Side: Payout Method and Forms */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="glass-panel" style={{ padding: '28px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0, 212, 255, 0.1)', paddingBottom: '16px', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#FFF', margin: 0 }}>🏦 Payout Configuration</h3>
                    {!isEditingPayout && (
                      <button onClick={() => setIsEditingPayout(true)} style={{ padding: '8px 16px', background: 'rgba(0, 212, 255, 0.08)', border: '1px solid rgba(0, 212, 255, 0.3)', borderRadius: '8px', color: '#00D4FF', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                        Modify Payout Settings
                      </button>
                    )}
                  </div>

                  <form onSubmit={triggerPayoutSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Method Selector */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Preferred Settlement Channel
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                        <div 
                          style={{
                            padding: '16px',
                            borderRadius: '12px',
                            border: '2px solid #00D4FF',
                            background: 'rgba(0, 212, 255, 0.06)',
                            textAlign: 'left',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#FFF', margin: '0 0 4px 0' }}>Direct Bank Deposit</h4>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Secure EFT Wire Transfer</span>
                        </div>
                      </div>
                    </div>

                    {/* Bank Transfer fields */}
                    {payoutMethod === 'bank' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>Account Holder Name</label>
                            <input 
                              type="text" 
                              value={bankHolder} 
                              onChange={(e) => setBankHolder(e.target.value)} 
                              disabled={!isEditingPayout}
                              style={{ width: '100%', padding: '12px', background: '#0a0a0a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', color: '#FFF', fontSize: '13px' }}
                              required
                            />
                          </div>
                          <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>Bank Name</label>
                            <div 
                              onClick={() => { if (isEditingPayout) { setShowBankDropdown(!showBankDropdown); setBankSearchQuery(''); } }}
                              style={{ 
                                width: '100%', 
                                padding: '12px', 
                                background: '#0a0a0a', 
                                border: '1px solid rgba(255, 255, 255, 0.08)', 
                                borderRadius: '8px', 
                                color: bankName ? '#FFF' : 'var(--text-muted)', 
                                fontSize: '13px',
                                cursor: isEditingPayout ? 'pointer' : 'default',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                boxSizing: 'border-box',
                                height: '45px'
                              }}
                            >
                              <span>{bankName || 'Select Bank'}</span>
                              {isEditingPayout && (
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)', transition: 'transform 0.2s', transform: showBankDropdown ? 'rotate(180deg)' : 'none' }}>▼</span>
                              )}
                            </div>

                            {isEditingPayout && showBankDropdown && (
                              <>
                                <div 
                                  onClick={() => setShowBankDropdown(false)} 
                                  style={{ position: 'fixed', inset: 0, zIndex: 999 }} 
                                />
                                <div style={{ 
                                  position: 'absolute', 
                                  top: '100%', 
                                  left: 0, 
                                  right: 0, 
                                  marginTop: '8px',
                                  background: 'rgba(10, 10, 10, 0.98)', 
                                  backdropFilter: 'blur(12px)',
                                  border: '1px solid rgba(0, 212, 255, 0.2)', 
                                  borderRadius: '8px', 
                                  zIndex: 1000,
                                  maxHeight: '250px',
                                  overflowY: 'auto',
                                  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
                                  padding: '10px',
                                  boxSizing: 'border-box'
                                }}>
                                  <input 
                                    type="text"
                                    placeholder="Search Bank..."
                                    value={bankSearchQuery}
                                    onChange={(e) => setBankSearchQuery(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    autoFocus
                                    style={{
                                      width: '100%',
                                      padding: '10px 12px',
                                      background: '#121212',
                                      border: '1px solid rgba(255, 255, 255, 0.1)',
                                      borderRadius: '6px',
                                      color: '#FFF',
                                      fontSize: '12px',
                                      marginBottom: '10px',
                                      outline: 'none',
                                      boxSizing: 'border-box'
                                    }}
                                  />
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {INDIAN_BANKS.filter(bank => 
                                      bank.toLowerCase().includes(bankSearchQuery.toLowerCase())
                                    ).map(bank => (
                                      <div
                                        key={bank}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setBankName(bank);
                                          setShowBankDropdown(false);
                                        }}
                                        style={{
                                          padding: '8px 12px',
                                          borderRadius: '6px',
                                          color: bank === bankName ? '#00D4FF' : '#E2E8F0',
                                          background: bank === bankName ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
                                          cursor: 'pointer',
                                          fontSize: '12px',
                                          transition: 'all 0.15s ease',
                                          textAlign: 'left',
                                          fontWeight: bank === bankName ? '600' : 'normal'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.target.style.background = 'rgba(0, 212, 255, 0.12)';
                                          e.target.style.color = '#FFF';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.background = bank === bankName ? 'rgba(0, 212, 255, 0.08)' : 'transparent';
                                          e.target.style.color = bank === bankName ? '#00D4FF' : '#E2E8F0';
                                        }}
                                      >
                                        {bank}
                                      </div>
                                    ))}
                                    {INDIAN_BANKS.filter(bank => 
                                      bank.toLowerCase().includes(bankSearchQuery.toLowerCase())
                                    ).length === 0 && (
                                      <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
                                        No banks found
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>Account Number</label>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <input 
                                type={(isEditingPayout || revealOwnerAccNum) ? "text" : "password"}
                                value={bankAccNum} 
                                onChange={(e) => setBankAccNum(e.target.value.replace(/\D/g,''))} 
                                disabled={!isEditingPayout}
                                style={{ width: '100%', padding: '12px 40px 12px 12px', background: '#0a0a0a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', color: '#FFF', fontSize: '13px', letterSpacing: (!isEditingPayout && !revealOwnerAccNum) ? '3px' : 'normal', boxSizing: 'border-box' }}
                                required
                              />
                              {!isEditingPayout && (
                                <button 
                                  type="button" 
                                  onClick={() => setRevealOwnerAccNum(!revealOwnerAccNum)} 
                                  style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                                >
                                  {revealOwnerAccNum ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                              )}
                            </div>
                          </div>
                          {isEditingPayout ? (
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>Confirm Account Number</label>
                              <input 
                                type="text" 
                                value={confirmBankAccNum} 
                                onChange={(e) => setConfirmBankAccNum(e.target.value.replace(/\D/g,''))} 
                                style={{ width: '100%', padding: '12px', background: '#0a0a0a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', color: '#FFF', fontSize: '13px' }}
                                required
                              />
                            </div>
                          ) : (
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>Masked Account Number</label>
                              <div style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '8px', color: '#FFF', fontSize: '13px', fontWeight: '700' }}>
                                •••• •••• {bankAccNum.slice(-4)}
                              </div>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>IFSC Code</label>
                            <input 
                              type="text" 
                              value={bankIfsc} 
                              onChange={(e) => setBankIfsc(e.target.value.toUpperCase())} 
                              disabled={!isEditingPayout}
                              style={{ width: '100%', padding: '12px', background: '#0a0a0a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', color: '#FFF', fontSize: '13px' }}
                              required
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>Branch Name (Optional)</label>
                            <input 
                              type="text" 
                              value={bankBranch} 
                              onChange={(e) => setBankBranch(e.target.value)} 
                              disabled={!isEditingPayout}
                              placeholder="e.g. T. Nagar Branch"
                              style={{ width: '100%', padding: '12px', background: '#0a0a0a', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', color: '#FFF', fontSize: '13px' }}
                            />
                          </div>
                        </div>
                      </div>
                    )}


                    {/* 3. Documents verification proof */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px', marginTop: '10px' }}>
                      <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#FFF', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        📄 Required Verification Proof Documents
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                        
                        {/* Bank Passbook */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Bank Passbook Front *</span>
                          {passbook ? (
                            <div style={{ position: 'relative', width: '100%', height: '110px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(0,212,255,0.1)' }}>
                              <img src={passbook} alt="Bank Passbook" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              {isEditingPayout && (
                                <button type="button" onClick={() => setPassbook('')} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255, 23, 68, 0.9)', color: '#FFF', border: 'none', borderRadius: '40%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>×</button>
                              )}
                            </div>
                          ) : (
                            <div style={{ border: '2px dashed rgba(255,255,255,0.08)', borderRadius: '10px', padding: '24px 10px', background: 'rgba(255,255,255,0.01)', textAlign: 'center', position: 'relative', minHeight: '110px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                              <input type="file" accept="image/*" onChange={(e) => handleDocUpload(e, 'passbook')} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} disabled={!isEditingPayout} />
                              <Camera size={18} color="var(--text-muted)" style={{ marginBottom: '6px' }} />
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Passbook Image</span>
                            </div>
                          )}
                        </div>

                        {/* PAN Card */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>PAN Card (Optional)</span>
                          {panCardDoc ? (
                            <div style={{ position: 'relative', width: '100%', height: '110px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(0,212,255,0.1)' }}>
                              <img src={panCardDoc} alt="PAN Card" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              {isEditingPayout && (
                                <button type="button" onClick={() => setPanCardDoc('')} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255, 23, 68, 0.9)', color: '#FFF', border: 'none', borderRadius: '40%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>×</button>
                              )}
                            </div>
                          ) : (
                            <div style={{ border: '2px dashed rgba(255,255,255,0.08)', borderRadius: '10px', padding: '24px 10px', background: 'rgba(255,255,255,0.01)', textAlign: 'center', position: 'relative', minHeight: '110px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                              <input type="file" accept="image/*" onChange={(e) => handleDocUpload(e, 'pan')} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} disabled={!isEditingPayout} />
                              <Camera size={18} color="var(--text-muted)" style={{ marginBottom: '6px' }} />
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>PAN Card Image</span>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>

                    {/* Edit Form Actions */}
                    {isEditingPayout && (
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '20px', marginTop: '10px' }}>
                        <button type="submit" className="glow-button" style={{ padding: '10px 24px', fontSize: '13px' }}>
                          Save Payout Settings
                        </button>
                        <button type="button" onClick={() => { setIsEditingPayout(false); }} style={{ padding: '10px 24px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#FFF', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                          Cancel
                        </button>
                      </div>
                    )}

                  </form>
                </div>
              </div>
            </div>



          </div>
        )}

        {currentTab === 'payout-history' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '60px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <History size={28} color="var(--primary)" />
              <span>Payout History</span>
            </h2>

            <div className="glass-panel" style={{ padding: '28px' }}>
              <div style={{ textAlign: 'left', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#FFF', margin: 0 }}>📋 Settlement Payout History</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Ledger detailing past transfers to your verified bank or UPI</p>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '12px' }}>Settlement ID</th>
                      <th style={{ padding: '12px' }}>Payout Date</th>
                      <th style={{ padding: '12px' }}>Method</th>
                      <th style={{ padding: '12px' }}>Net Amount</th>
                      <th style={{ padding: '12px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(user.settlementHistory || []).length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No settlement payouts processed yet.</td>
                      </tr>
                    ) : (
                      (user.settlementHistory || []).map((s, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '14px 12px', color: 'var(--primary)', fontWeight: 'bold' }}>#{s.id}</td>
                          <td style={{ padding: '14px 12px', color: '#FFF' }}>{new Date(s.date).toLocaleDateString()}</td>
                          <td style={{ padding: '14px 12px', color: 'var(--text-secondary)' }}>{s.method}</td>
                          <td style={{ padding: '14px 12px', color: '#00E5A0', fontWeight: 'bold' }}>₹{s.amount}</td>
                          <td style={{ padding: '14px 12px' }}>
                            <span style={{ fontSize: '9px', fontWeight: '800', background: 'rgba(0, 229, 160, 0.12)', color: '#00E5A0', padding: '2px 6px', borderRadius: '4px' }}>
                              {s.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {currentTab === 'profile' && (
          <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={28} color="var(--primary)" />
              <span>Host Profile Management</span>
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '280px 1fr',
              gap: '24px',
              alignItems: 'start'
            }}>
              {/* Left Column: Sub-navigation sidebar */}
              <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Mini User Summary */}
                <div style={{ padding: '12px 8px', borderBottom: '1px solid var(--border-color)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src={profilePic || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'} alt="Avatar" style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} />
                  <div style={{ textAlign: 'left', minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profileName || 'Suresh Perumal'}</div>
                    <div style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: '800', letterSpacing: '0.5px' }}>✓ HOST VERIFIED</div>
                  </div>
                </div>

                {/* Sub-tabs buttons */}
                {[
                  { id: 'overview', label: 'Host Dashboard', icon: <Activity size={16} /> },
                  { id: 'personal', label: 'Personal Information', icon: <User size={16} /> },
                  { id: 'bank', label: 'Bank Payout Details', icon: <CreditCard size={16} /> },
                  { id: 'security', label: 'Security & 2FA', icon: <Shield size={16} /> }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setProfileSubTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: 'none',
                      background: profileSubTab === tab.id ? 'var(--primary-glow)' : 'transparent',
                      color: profileSubTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: profileSubTab === tab.id ? '700' : '500',
                      fontSize: '13px',
                      transition: 'all 0.2s',
                      borderLeft: profileSubTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent'
                    }}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Right Column: Active Sub-tab View */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* 1. OVERVIEW */}
                {profileSubTab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                      {[
                        { label: 'Total Earnings', value: `₹${totalEarnings}`, icon: <DollarSign size={20} color="var(--primary)" />, bg: 'var(--primary-glow)' },
                        { label: 'Platform Bookings', value: ownerBks.length, icon: <FileText size={20} color="var(--accent-green)" />, bg: 'rgba(0, 229, 160, 0.1)' },
                        { label: 'Managed Properties', value: ownerLocs.length, icon: <MapPin size={20} color="var(--secondary)" />, bg: 'var(--secondary-glow)' }
                      ].map((stat, i) => (
                        <div key={i} className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {stat.icon}
                          </div>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>{stat.label}</div>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#FFF', marginTop: '2px' }}>{stat.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Business Entity details info */}
                    <div className="glass-panel" style={{ padding: '24px', textAlign: 'left' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building size={18} color="var(--primary)" />
                        <span>Registered Business Entity</span>
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                        <div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}>Company Name</span>
                          <span style={{ color: '#FFF', fontWeight: 'bold' }}>{companyName}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}>GSTIN Reg ID</span>
                          <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{companyGstin}</span>
                        </div>
                      </div>
                      <div style={{ marginTop: '14px', fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '2px' }}>Registered Office Address</span>
                        <span style={{ color: '#FFF' }}>{companyAddress}</span>
                      </div>
                    </div>

                    {/* Bank Payout details info */}
                    <div className="glass-panel" style={{ padding: '20px 24px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0, 229, 160, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                          🏦
                        </div>
                        <div>
                          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#FFF' }}>Bank Payout Account</h4>
                          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{bankName} • Account ending in {bankAccNum.slice(-4) || '1234'}</p>
                        </div>
                      </div>
                      <button onClick={() => setProfileSubTab('bank')} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--primary)', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>Edit Bank</button>
                    </div>
                  </div>
                )}

                {/* 2. PERSONAL INFO */}
                {profileSubTab === 'personal' && (
                  <form onSubmit={handleSaveProfileChanges} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#FFF', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '4px', textAlign: 'left' }}>Personal Information</h3>
                    
                    {/* Avatar Selection Block */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '12px' }}>
                      <div style={{ position: 'relative' }}>
                        <img src={profilePic || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'} alt="Avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary)' }} />
                        <label style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--secondary)', color: '#FFF', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid var(--bg-primary)' }}>
                          <Camera size={14} />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => setProfilePic(reader.result);
                                reader.readAsDataURL(file);
                              }
                            }}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#FFF' }}>Upload Host Avatar</h4>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>PNG or JPG format under 1MB. Or select standard avatar.</p>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          {[
                            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100',
                            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100',
                            'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=100'
                          ].map((url, idx) => (
                            <img key={idx} src={url} alt="Avatar Selection" onClick={() => setProfilePic(url)} style={{ width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', border: profilePic === url ? '2px solid var(--primary)' : '1px solid var(--border-color)', objectFit: 'cover' }} />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>Full Name</label>
                        <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#FFF', outline: 'none' }} required />
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>Mobile Number</label>
                        <input type="text" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#FFF', outline: 'none' }} required />
                      </div>
                    </div>

                    <div style={{ textAlign: 'left' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>Email Address</label>
                      <input type="email" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#FFF', outline: 'none' }} required />
                    </div>

                    <button type="submit" className="glow-button" style={{ width: '100%', padding: '12px', marginTop: '8px' }}>Save Profile Changes</button>
                  </form>
                )}


                {/* 4. BANK PAYOUT DETAILS */}
                {profileSubTab === 'bank' && (
                  <form onSubmit={handleSaveBankDetails} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#FFF', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '4px', textAlign: 'left' }}>Bank Payout Account</h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '-8px', textAlign: 'left' }}>Earnings are automatically processed and transferred to this account every month.</p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>Account Holder Name</label>
                        <input type="text" value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#FFF', outline: 'none' }} required />
                      </div>
                      <div style={{ textAlign: 'left', position: 'relative' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>Bank Name</label>
                        <div 
                          onClick={() => { setShowBankDropdownProfile(!showBankDropdownProfile); setBankSearchQueryProfile(''); }}
                          style={{ 
                            width: '100%', 
                            padding: '10px 12px', 
                            background: 'var(--bg-primary)', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '8px', 
                            color: bankName ? '#FFF' : 'var(--text-muted)', 
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            boxSizing: 'border-box',
                            height: '38px'
                          }}
                        >
                          <span>{bankName || 'Select Bank'}</span>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', transition: 'transform 0.2s', transform: showBankDropdownProfile ? 'rotate(180deg)' : 'none' }}>▼</span>
                        </div>

                        {showBankDropdownProfile && (
                          <>
                            <div 
                              onClick={() => setShowBankDropdownProfile(false)} 
                              style={{ position: 'fixed', inset: 0, zIndex: 999 }} 
                            />
                            <div style={{ 
                              position: 'absolute', 
                              top: '100%', 
                              left: 0, 
                              right: 0, 
                              marginTop: '8px',
                              background: 'rgba(10, 10, 10, 0.98)', 
                              backdropFilter: 'blur(12px)',
                              border: '1px solid rgba(0, 212, 255, 0.2)', 
                              borderRadius: '8px', 
                              zIndex: 1000,
                              maxHeight: '250px',
                              overflowY: 'auto',
                              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
                              padding: '10px',
                              boxSizing: 'border-box'
                            }}>
                              <input 
                                type="text"
                                placeholder="Search Bank..."
                                value={bankSearchQueryProfile}
                                onChange={(e) => setBankSearchQueryProfile(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                                style={{
                                  width: '100%',
                                  padding: '10px 12px',
                                  background: '#121212',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  borderRadius: '6px',
                                  color: '#FFF',
                                  fontSize: '12px',
                                  marginBottom: '10px',
                                  outline: 'none',
                                  boxSizing: 'border-box'
                                }}
                              />
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {INDIAN_BANKS.filter(bank => 
                                  bank.toLowerCase().includes(bankSearchQueryProfile.toLowerCase())
                                ).map(bank => (
                                  <div
                                    key={bank}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setBankName(bank);
                                      setShowBankDropdownProfile(false);
                                    }}
                                    style={{
                                      padding: '8px 12px',
                                      borderRadius: '6px',
                                      color: bank === bankName ? '#00D4FF' : '#E2E8F0',
                                      background: bank === bankName ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      transition: 'all 0.15s ease',
                                      textAlign: 'left',
                                      fontWeight: bank === bankName ? '600' : 'normal'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.target.style.background = 'rgba(0, 212, 255, 0.12)';
                                      e.target.style.color = '#FFF';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.background = bank === bankName ? 'rgba(0, 212, 255, 0.08)' : 'transparent';
                                      e.target.style.color = bank === bankName ? '#00D4FF' : '#E2E8F0';
                                    }}
                                  >
                                    {bank}
                                  </div>
                                ))}
                                {INDIAN_BANKS.filter(bank => 
                                  bank.toLowerCase().includes(bankSearchQueryProfile.toLowerCase())
                                ).length === 0 && (
                                  <div style={{ padding: '12px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
                                    No banks found
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                      <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>Account Number</label>
                        <input type="text" value={bankAccNum} onChange={(e) => setBankAccNum(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#FFF', outline: 'none' }} required />
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>IFSC Code</label>
                        <input type="text" value={bankIfsc} onChange={(e) => setBankIfsc(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#FFF', outline: 'none' }} required />
                      </div>
                    </div>

                    <button type="submit" className="glow-button" style={{ width: '100%', padding: '12px', marginTop: '8px' }}>Update Payout Account</button>
                  </form>
                )}

                {/* 5. SECURITY & 2FA */}
                {profileSubTab === 'security' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <form onSubmit={handleChangePassword} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#FFF', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', textAlign: 'left' }}>Change Password</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ textAlign: 'left' }}>
                          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Current Password</label>
                          <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#FFF' }} required />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>New Password</label>
                          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#FFF' }} required />
                        </div>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Confirm New Password</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: '#FFF' }} required />
                      </div>
                      <button type="submit" className="glow-button" style={{ width: '100%', padding: '12px', marginTop: '8px' }}>Update Password</button>
                    </form>

                    <div className="glass-panel" style={{ padding: '24px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#FFF', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px', textAlign: 'left' }}>Host Portal Verification</h3>
                      
                      {/* 2FA Sim */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '12px' }}>
                        <div style={{ textAlign: 'left', paddingRight: '12px', flex: 1 }}>
                          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#FFF' }}>Enable Host Two-Factor Authentication</h4>
                          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Protect your payout bank credentials with SMS login codes.</p>
                        </div>
                        <input type="checkbox" checked={twoFactorEnabled} onChange={(e) => { setTwoFactorEnabled(e.target.checked); updateProfile({ security: { twoFactorEnabled: e.target.checked } }); showAlert(e.target.checked ? "2FA Enabled! Payout account changes will require verification code." : "2FA Disabled.", "Security"); }} style={{ width: '42px', height: '20px', cursor: 'pointer', flexShrink: 0 }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ALERTS */}
      {customAlert && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 150, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '320px', padding: '24px', borderRadius: '16px', textAlign: 'center' }}>
            <AlertCircle size={32} color="var(--primary)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>{customAlert.title}</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>{customAlert.message}</p>
            <button onClick={() => setCustomAlert(null)} className="glow-button" style={{ width: '100%', padding: '10px' }}>Okay</button>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spinning { animation: spin 1s linear infinite; }
      `}</style>
      {/* OTP Security Gate Modal */}
      {showOtpModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '360px', padding: '28px', borderRadius: '16px', border: '1px solid rgba(0,212,255,0.2)', textAlign: 'center' }}>
            <Lock size={32} color="var(--primary)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#FFF', marginBottom: '8px' }}>Security Verification</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
              We have sent a 6-digit OTP code to your registered mobile number <strong>{ownerProfile.phone}</strong>. Please enter it below to authorize this change.
            </p>
            <input 
              type="text" 
              placeholder="Enter OTP" 
              value={otpInput} 
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g,'').slice(0, 6))}
              style={{ width: '100%', padding: '12px', background: '#0a0a0a', border: otpError ? '1px solid #FF3366' : '1px solid rgba(0,212,255,0.2)', borderRadius: '8px', color: '#FFF', fontSize: '16px', fontWeight: 'bold', letterSpacing: '4px', textAlign: 'center', outline: 'none', marginBottom: '12px' }}
            />
            {otpError && (
              <p style={{ fontSize: '11px', color: '#FF3366', margin: '0 0 16px 0', fontWeight: 'bold' }}>{otpError}</p>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleVerifyOtp} className="glow-button" style={{ flex: 1, padding: '10px', fontSize: '13px' }}>Confirm</button>
              <button onClick={() => setShowOtpModal(false)} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#FFF', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Booking OTP verification Modal */}
      {showBookingOtpModal && selectedBookingForOtp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '360px', padding: '28px', borderRadius: '16px', border: '1px solid var(--primary)', textAlign: 'center' }}>
            <QrCode size={32} color="var(--primary)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#FFF', marginBottom: '8px' }}>Verify Cash Booking</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
              Ask the customer for the 4-digit verification code showing on their ticket, collect cash of <strong>₹{selectedBookingForOtp.totalAmount}</strong>, and enter the code below to complete checkout.
            </p>
            <input 
              type="text" 
              placeholder="e.g. 1234" 
              value={bookingOtpInput} 
              onChange={(e) => setBookingOtpInput(e.target.value.replace(/\D/g,'').slice(0, 4))}
              style={{ width: '100%', padding: '12px', background: '#0a0a0a', border: bookingOtpError ? '1px solid #FF3366' : '1px solid rgba(0,212,255,0.2)', borderRadius: '8px', color: '#FFF', fontSize: '20px', fontWeight: 'bold', letterSpacing: '8px', textAlign: 'center', outline: 'none', marginBottom: '12px' }}
            />
            {bookingOtpError && (
              <p style={{ fontSize: '11px', color: '#FF3366', margin: '0 0 16px 0', fontWeight: 'bold' }}>{bookingOtpError}</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={(e) => handleVerifyBookingWithOtp(e)} className="glow-button" style={{ flex: 1, padding: '10px', fontSize: '13px' }}>Verify & Complete</button>
                <button type="button" onClick={() => { setShowBookingOtpModal(false); setSelectedBookingForOtp(null); }} style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#FFF', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              </div>
              <button type="button" onClick={(e) => handleBypassBookingOtp(e)} style={{ width: '100%', padding: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', transition: 'all 0.2s ease' }}>
                Collect Cash & Bypass OTP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoginScreen({ onLogin, onGoogleLogin, roleHint }) {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const [showIntro, setShowIntro] = useState(false);
  const [fadeOutIntro, setFadeOutIntro] = useState(true);

  useEffect(() => {
    // Intro sequence disabled by user request
  }, []);

  const handleSkip = () => {
    setFadeOutIntro(true);
    setShowIntro(false);
  };


  const handleSubmit = (e) => {
    e.preventDefault();
    if (!emailOrPhone.trim()) {
      setError("Please enter your email or phone number.");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }
    try {
      onLogin(emailOrPhone, password);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleQuickLogin = (email, pass) => {
    setEmailOrPhone(email);
    setPassword(pass);
    try {
      onLogin(email, pass);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#040404',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'var(--font-main, sans-serif)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100vw'
    }}>
      <style>{`
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 10px rgba(0, 230, 118, 0.4); }
          50% { box-shadow: 0 0 25px rgba(0, 230, 118, 0.8); }
          100% { box-shadow: 0 0 10px rgba(0, 230, 118, 0.4); }
        }

        @keyframes driveLeftToRight {
          0% { transform: translateX(-100vw) scale(0.5) rotateY(45deg) rotateX(10deg); opacity: 0; filter: blur(6px); }
          60% { transform: translateX(5vw) scale(0.85) rotateY(-20deg) rotateX(-5deg); opacity: 1; filter: blur(0); }
          80% { transform: translateX(-2vw) scale(0.95) rotateY(10deg) rotateX(2deg); opacity: 1; }
          100% { transform: translateX(0) scale(1) rotateY(-10deg) rotateX(5deg); opacity: 1; }
        }

        @keyframes suspensionBounce {
          0% { transform: rotate(0deg) translateY(0); }
          40% { transform: rotate(-1.5deg) translateY(4px); }
          70% { transform: rotate(0.5deg) translateY(-1px); }
          100% { transform: rotate(0deg) translateY(0); }
        }

        @keyframes headlightFlash {
          0%, 100% { box-shadow: none; opacity: 0; }
          50% { box-shadow: 0 0 30px #00E676, 0 0 60px #00E676; opacity: 1; }
        }

        @keyframes textFadeIn {
          from { opacity: 0; transform: translateY(-15px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes underglowFade {
          0% { opacity: 0; transform: scaleX(0.5); }
          100% { opacity: 1; transform: scaleX(1); }
        }

        @keyframes underglowPulse {
          0%, 100% { opacity: 0.8; filter: blur(8px) drop-shadow(0 0 5px rgba(0, 230, 118, 0.4)); }
          50% { opacity: 1.0; filter: blur(10px) drop-shadow(0 0 15px rgba(0, 230, 118, 0.8)); }
        }

        .ferrari-container {
          position: relative;
          width: 850px;
          height: 320px;
          display: flex;
          align-items: center;
          justifyContent: center;
          animation: driveLeftToRight 1.3s cubic-bezier(0.25, 1, 0.5, 1) forwards, suspensionBounce 0.5s ease-out 1.3s;
          z-index: 101;
          transform-style: preserve-3d;
          perspective: 1000px;
        }

        @keyframes engineVibration {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-0.8px) translateX(0.3px); }
        }

        .ferrari-body {
          width: 100%;
          height: 100%;
          mix-blend-mode: screen;
          animation: engineVibration 0.12s infinite 1.3s;
        }

        .ferrari-svg-hologram {
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 0 10px rgba(0, 230, 118, 0.3));
        }

        .radar-ring {
          transform-origin: 190px 220px;
          animation: pulseRadar 3s infinite linear;
        }

        .radar-ring-reverse {
          transform-origin: 550px 225px;
          animation: pulseRadar 3s infinite linear reverse;
        }

        @keyframes pulseRadar {
          0% { transform: scale(0.9); opacity: 0.2; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(0.9); opacity: 0.2; }
        }

        .holo-draw-path {
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: drawOutline 2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        @keyframes drawOutline {
          to { stroke-dashoffset: 0; }
        }

        .holo-interior {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: drawOutline 1.5s cubic-bezier(0.25, 1, 0.5, 1) 0.5s forwards;
        }

        .holo-wheel-spin {
          animation: spinHoloWheel 1.3s cubic-bezier(0.25, 1, 0.5, 1) forwards, spinHoloWheelConstant 4s linear infinite 1.3s;
        }

        @keyframes spinHoloWheel {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(1080deg); }
        }

        @keyframes spinHoloWheelConstant {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .ferrari-underglow {
          position: absolute;
          bottom: 25px;
          left: 120px;
          width: 610px;
          height: 15px;
          background: radial-gradient(ellipse at center, rgba(0, 230, 118, 0.85) 0%, rgba(0, 230, 118, 0) 75%);
          filter: blur(8px);
          opacity: 0;
          animation: underglowFade 0.8s ease-out 1.3s forwards, underglowPulse 2s infinite ease-in-out 2.1s;
          z-index: 99;
          pointer-events: none;
        }

        .ferrari-headlight {
          position: absolute;
          right: 95px;
          top: 212px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #FFF;
          opacity: 0;
          animation: headlightFlash 0.5s ease-in-out 1.3s 2 forwards;
          z-index: 102;
        }

        .headlight-beam {
          position: absolute;
          left: 8px;
          top: -142px;
          width: 500px;
          height: 300px;
          background: radial-gradient(ellipse at left center, rgba(0, 230, 118, 0.22) 0%, rgba(0, 230, 118, 0) 70%);
          clip-path: polygon(0% 48%, 100% 0%, 100% 100%, 0% 52%);
          opacity: 0;
          animation: beamFlash 0.5s ease-in-out 1.3s 2 forwards;
          transform-origin: left center;
          z-index: 101;
          pointer-events: none;
        }

        @keyframes beamFlash {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }

        .ferrari-holo-door {
          position: absolute;
          left: 310px;
          top: 135px;
          width: 170px;
          height: 85px;
          background: linear-gradient(135deg, rgba(0, 230, 118, 0.15) 0%, rgba(0, 230, 118, 0.02) 100%);
          border: 1.5px solid #00E676;
          box-shadow: 0 0 20px rgba(0, 230, 118, 0.4), inset 0 0 15px rgba(0, 230, 118, 0.2);
          transform-origin: bottom right;
          opacity: 0;
          animation: openHoloDoor 0.8s cubic-bezier(0.25, 1, 0.5, 1) 1.7s forwards, holoGlowPulse 1.5s infinite alternate ease-in-out 2.5s;
          z-index: 103;
          pointer-events: none;
          clip-path: polygon(0% 25%, 90% 0%, 100% 45%, 85% 100%, 10% 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justifyContent: center;
          overflow: hidden;
        }

        .holo-grid {
          position: absolute;
          inset: 0;
          background: linear-gradient(rgba(0, 230, 118, 0.1) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(0, 230, 118, 0.1) 1px, transparent 1px);
          background-size: 6px 6px;
          opacity: 0.6;
          pointer-events: none;
        }

        .holo-scanline {
          position: absolute;
          top: -10%;
          left: 0;
          width: 100%;
          height: 4px;
          background: rgba(0, 230, 118, 0.8);
          box-shadow: 0 0 8px #00E676;
          animation: holoScan 2.5s linear infinite;
          pointer-events: none;
        }

        .holo-hud-text {
          font-family: monospace;
          color: #00E676;
          text-shadow: 0 0 5px #00E676;
          font-size: 8px;
          font-weight: bold;
          letter-spacing: 0.5px;
          line-height: 1.2;
          text-align: center;
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 2px;
          animation: textPulse 1s infinite alternate;
        }

        .holo-tag {
          font-size: 9px;
          border: 1px solid rgba(0, 230, 118, 0.4);
          padding: 1px 4px;
          border-radius: 2px;
          margin-bottom: 2px;
          background: rgba(0, 230, 118, 0.1);
        }

        .holo-status {
          opacity: 0.9;
        }

        .holo-code {
          font-size: 6px;
          opacity: 0.6;
        }

        @keyframes openHoloDoor {
          0% {
            transform: perspective(1000px) rotateY(0deg) rotateZ(0deg) translateZ(0);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: perspective(1000px) rotateY(-35deg) rotateZ(-30deg) translateY(-40px) translateX(15px) translateZ(50px);
            opacity: 1;
          }
        }

        @keyframes holoGlowPulse {
          from { box-shadow: 0 0 20px rgba(0, 230, 118, 0.4), inset 0 0 15px rgba(0, 230, 118, 0.2); border-color: rgba(0, 230, 118, 0.8); }
          to { box-shadow: 0 0 35px rgba(0, 230, 118, 0.7), inset 0 0 25px rgba(0, 230, 118, 0.4); border-color: rgba(0, 230, 118, 1); }
        }

        @keyframes holoScan {
          0% { top: -10%; }
          100% { top: 110%; }
        }

        @keyframes textPulse {
          from { opacity: 0.6; }
          to { opacity: 1; }
        }

        @keyframes gridMove {
          0% { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }
        @keyframes floatBlob {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes borderRotate {
          100% { transform: rotate(360deg); }
        }
        .tech-grid-bg {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(0, 230, 118, 0.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0, 230, 118, 0.04) 1px, transparent 1px);
          background-size: 40px 40px;
          animation: gridMove 8s linear infinite;
          opacity: 0.8;
          z-index: 1;
          pointer-events: none;
        }
        .glow-blob-1 {
          position: absolute;
          top: 15%;
          left: 15%;
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(0, 230, 118, 0.12) 0%, transparent 70%);
          filter: blur(40px);
          animation: floatBlob 15s ease-in-out infinite;
          z-index: 0;
          pointer-events: none;
        }
        .glow-blob-2 {
          position: absolute;
          bottom: 15%;
          right: 15%;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(41, 121, 255, 0.08) 0%, transparent 70%);
          filter: blur(40px);
          animation: floatBlob 20s ease-in-out infinite reverse;
          z-index: 0;
          pointer-events: none;
        }
        .border-glow-wrapper {
          position: relative;
          padding: 1.5px;
          border-radius: 24px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.03);
          z-index: 2;
          box-shadow: 0 30px 70px rgba(0, 0, 0, 0.8);
          transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.5s ease;
        }
        .border-glow-wrapper::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: conic-gradient(
            transparent, 
            rgba(0, 230, 118, 0.6), 
            transparent 30%, 
            transparent 50%, 
            rgba(41, 121, 255, 0.6), 
            transparent 80%
          );
          animation: borderRotate 6s linear infinite;
          z-index: 0;
        }
        .border-glow-wrapper:hover {
          transform: perspective(1000px) rotateX(3deg) rotateY(-3deg) translateZ(10px) !important;
          box-shadow: 0 35px 80px rgba(0, 230, 118, 0.15), 0 25px 50px rgba(0, 0, 0, 0.9) !important;
        }
        .new-glass-card {
          position: relative;
          width: 100%;
          background: rgba(12, 12, 12, 0.92);
          backdrop-filter: blur(30px);
          border-radius: 23px;
          padding: 40px;
          box-sizing: border-box;
          z-index: 1;
        }

      `}</style>



      {/* Intro Overlay */}
      {showIntro && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: '#000',
          zIndex: 100,
          opacity: fadeOutIntro ? 0 : 1,
          transition: 'opacity 0.6s ease-in-out',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          <button
            onClick={handleSkip}
            style={{
              position: 'absolute',
              top: '30px',
              right: '30px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#B0BEC5',
              padding: '8px 16px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              letterSpacing: '1px',
              zIndex: 110,
              pointerEvents: 'auto'
            }}
          >
            SKIP INTRO
          </button>
          <div style={{
            position: 'absolute',
            top: '8%',
            textAlign: 'center',
            zIndex: 105,
            animation: 'textFadeIn 1s ease-out'
          }}>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '24px', fontWeight: '900', color: '#FFF', letterSpacing: '1px', textTransform: 'uppercase' }}>ParkHub</h1>
            <p style={{ fontSize: '11px', color: 'var(--primary, #00E676)', fontWeight: '700', letterSpacing: '3px' }}>
              {roleHint ? `${roleHint} Secure Portal` : 'Smart Network'}
            </p>
          </div>
          <div className="ferrari-container">
            <div className="ferrari-underglow"></div>
            <div className="ferrari-body">
              <svg viewBox="0 0 800 300" width="100%" height="100%" className="ferrari-svg-hologram">
                <defs>
                  <linearGradient id="holo-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00E676" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#00b0ff" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#00E676" stopOpacity="0.8" />
                  </linearGradient>
                  <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                
                {/* Tech Radar Rings around wheels */}
                <circle cx="190" cy="220" r="50" stroke="rgba(0, 230, 118, 0.2)" strokeWidth="1" strokeDasharray="4 8" fill="none" className="radar-ring" />
                <circle cx="550" cy="225" r="50" stroke="rgba(0, 230, 118, 0.2)" strokeWidth="1" strokeDasharray="4 8" fill="none" className="radar-ring-reverse" />
                
                {/* Ground grid shadow/laser line */}
                <line x1="80" y1="230" x2="720" y2="230" stroke="rgba(0, 230, 118, 0.4)" strokeWidth="1" strokeDasharray="5 5" />
                
                {/* Main Body Outline - Ferrari SF90 Stradale 3/4 Front Perspective */}
                <path 
                  d="M 100,220 
                     L 100,215 
                     C 100,195 120,182 145,182 
                     C 190,182 250,175 290,165 
                     C 320,135 340,122 380,120 
                     C 410,118 450,118 480,125 
                     C 520,135 560,152 590,165 
                     C 620,175 660,185 700,195 
                     C 715,198 720,205 710,215 
                     L 700,225 
                     L 680,228 
                     L 592,228 
                     A 42,42 0 0,0 508,228 
                     L 228,222 
                     A 38,38 0 0,0 152,218 
                     L 105,220 
                     Z" 
                  fill="rgba(0, 230, 118, 0.03)" 
                  stroke="url(#holo-glow)" 
                  strokeWidth="2.5" 
                  filter="url(#glow-filter)"
                  className="holo-draw-path"
                />

                {/* Canopy and Windshield lines */}
                <path 
                  d="M 380,120 C 420,123 480,132 505,162 L 485,155 L 380,120 Z" 
                  fill="none" 
                  stroke="rgba(0, 230, 118, 0.7)" 
                  strokeWidth="1.5" 
                  className="holo-interior"
                />
                {/* Left A-pillar */}
                <path 
                  d="M 380,120 L 485,155" 
                  stroke="rgba(0, 230, 118, 0.6)" 
                  strokeWidth="1.5" 
                />
                {/* Right A-pillar */}
                <path 
                  d="M 425,118 L 525,165" 
                  stroke="rgba(0, 230, 118, 0.6)" 
                  strokeWidth="1.5" 
                />
                {/* Near side window */}
                <path 
                  d="M 425,118 C 455,142 470,158 480,165" 
                  stroke="rgba(0, 230, 118, 0.6)" 
                  strokeWidth="1.5" 
                  fill="none"
                />
                {/* Cabin rear pillar */}
                <path 
                  d="M 345,130 C 375,155 375,165 375,170" 
                  stroke="rgba(0, 230, 118, 0.6)" 
                  strokeWidth="1.5" 
                  fill="none"
                />

                {/* S-Duct intake on hood */}
                <path 
                  d="M 515,165 C 540,172 580,178 610,183 C 585,188 545,180 515,165 Z" 
                  fill="rgba(0, 230, 118, 0.08)" 
                  stroke="rgba(0, 230, 118, 0.7)" 
                  strokeWidth="1.2" 
                />
                {/* S-Duct channel exit lines */}
                <path d="M 550,170 Q 560,185 580,190" stroke="rgba(0, 230, 118, 0.5)" strokeWidth="1" fill="none" />
                <path d="M 570,174 Q 580,192 600,196" stroke="rgba(0, 230, 118, 0.5)" strokeWidth="1" fill="none" />
                {/* Centerline of the hood */}
                <path d="M 505,162 C 550,172 610,185 680,200" stroke="rgba(0, 230, 118, 0.4)" strokeWidth="1" fill="none" />

                {/* Near headlight (right) */}
                <path d="M 655,190 Q 685,194 695,202 Q 675,206 655,190 Z" fill="rgba(0,230,118,0.2)" stroke="#00E676" strokeWidth="2" filter="url(#glow-filter)" />
                <path d="M 660,193 L 688,197 L 678,202" fill="none" stroke="#FFF" strokeWidth="1" />
                {/* Far headlight (left) */}
                <path d="M 610,176 Q 630,178 638,184 Q 622,186 610,176 Z" fill="rgba(0,230,118,0.2)" stroke="#00E676" strokeWidth="1.5" filter="url(#glow-filter)" />
                <path d="M 614,178 L 632,180" fill="none" stroke="#FFF" strokeWidth="0.8" />

                {/* Side Mirror */}
                <path d="M 490,156 C 505,152 510,154 505,160 Z" fill="rgba(0, 230, 118, 0.2)" stroke="rgba(0, 230, 118, 0.7)" strokeWidth="1.2" />
                <line x1="485" y1="160" x2="490" y2="156" stroke="rgba(0, 230, 118, 0.7)" strokeWidth="1.2" />

                {/* B-pillar side intake scoop */}
                <path 
                  d="M 315,168 L 275,208 L 255,192 Z" 
                  fill="rgba(0, 230, 118, 0.1)" 
                  stroke="rgba(0, 230, 118, 0.7)" 
                  strokeWidth="1.2" 
                />
                <path d="M 285,185 L 265,200" stroke="rgba(0, 230, 118, 0.5)" strokeWidth="1" fill="none" />
                <path d="M 295,180 L 275,195" stroke="rgba(0, 230, 118, 0.5)" strokeWidth="1" fill="none" />
                {/* Front bumper intakes */}
                <path d="M 650,210 L 690,212 L 675,224 Z" fill="rgba(0, 230, 118, 0.05)" stroke="rgba(0, 230, 118, 0.5)" strokeWidth="1" />
                <path d="M 610,194 L 630,196 L 622,204 Z" fill="rgba(0, 230, 118, 0.05)" stroke="rgba(0, 230, 118, 0.5)" strokeWidth="1" />

                {/* Character Lines */}
                <path d="M 145,185 C 220,185 300,195 440,205 C 500,205 530,208 550,210" fill="none" stroke="rgba(0, 230, 118, 0.4)" strokeWidth="1" />
                <path d="M 320,165 L 315,221" stroke="rgba(0, 230, 118, 0.4)" strokeWidth="1" fill="none" />
                <path d="M 480,165 L 490,225" stroke="rgba(0, 230, 118, 0.4)" strokeWidth="1" fill="none" />
                <path d="M 220,182 C 255,182 275,195 285,215" fill="none" stroke="rgba(0, 230, 118, 0.4)" strokeWidth="1" />

                {/* Rotating wheels (5-spoke dynamic star alloys in 3D perspective) */}
                <g style={{ transform: 'translate(190px, 220px) rotateY(-55deg) rotateX(5deg)', transformStyle: 'preserve-3d' }}>
                  <g className="holo-wheel-spin" style={{ transformOrigin: '0px 0px' }}>
                    <circle cx="0" cy="0" r="32" stroke="rgba(0, 230, 118, 0.8)" strokeWidth="2" fill="none" />
                    <circle cx="0" cy="0" r="26" stroke="rgba(0, 230, 118, 0.3)" strokeWidth="1" fill="none" />
                    <circle cx="0" cy="0" r="7" stroke="#00E676" strokeWidth="1.5" fill="rgba(0, 0, 0, 0.9)" />
                    {[0, 72, 144, 216, 288].map((angle, idx) => (
                      <g key={idx} transform={`rotate(${angle}, 0, 0)`}>
                        <line x1="0" y1="0" x2="0" y2="-32" stroke="rgba(0, 230, 118, 0.8)" strokeWidth="1.5" />
                        <line x1="0" y1="-10" x2="-3" y2="-32" stroke="rgba(0, 230, 118, 0.6)" strokeWidth="1" />
                        <line x1="0" y1="-10" x2="3" y2="-32" stroke="rgba(0, 230, 118, 0.6)" strokeWidth="1" />
                      </g>
                    ))}
                  </g>
                </g>

                <g style={{ transform: 'translate(550px, 225px) rotateY(-55deg) rotateX(5deg)', transformStyle: 'preserve-3d' }}>
                  <g className="holo-wheel-spin" style={{ transformOrigin: '0px 0px' }}>
                    <circle cx="0" cy="0" r="38" stroke="rgba(0, 230, 118, 0.8)" strokeWidth="2" fill="none" />
                    <circle cx="0" cy="0" r="32" stroke="rgba(0, 230, 118, 0.3)" strokeWidth="1" fill="none" />
                    <circle cx="0" cy="0" r="8" stroke="#00E676" strokeWidth="1.5" fill="rgba(0, 0, 0, 0.9)" />
                    {[0, 72, 144, 216, 288].map((angle, idx) => (
                      <g key={idx} transform={`rotate(${angle}, 0, 0)`}>
                        <line x1="0" y1="0" x2="0" y2="-38" stroke="rgba(0, 230, 118, 0.8)" strokeWidth="1.5" />
                        <line x1="0" y1="-12" x2="-3" y2="-38" stroke="rgba(0, 230, 118, 0.6)" strokeWidth="1" />
                        <line x1="0" y1="-12" x2="3" y2="-38" stroke="rgba(0, 230, 118, 0.6)" strokeWidth="1" />
                      </g>
                    ))}
                  </g>
                </g>
              </svg>
            </div>
            
            <div className="ferrari-headlight">
              <div className="headlight-beam"></div>
            </div>
            
            <div className="ferrari-holo-door">
              <div className="holo-grid"></div>
              <div className="holo-scanline"></div>
              <div className="holo-hud-text">
                <span className="holo-tag">SECURE LINK</span>
                <span className="holo-status">SYS: OPENING</span>
                <span className="holo-code">PORT_3001_OK</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Background Tech Elements */}
      <div className="tech-grid-bg"></div>
      <div className="glow-blob-1"></div>
      <div className="glow-blob-2"></div>

      {/* Centered Glass Login Card */}
      <div className="border-glow-wrapper" style={{
        width: '90%',
        maxWidth: '430px',
        opacity: fadeOutIntro ? 1 : 0,
        transform: fadeOutIntro 
          ? 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0) translateY(0)' 
          : 'perspective(1000px) rotateX(15deg) rotateY(-10deg) translateZ(-120px) translateY(50px)',
        transition: fadeOutIntro 
          ? 'opacity 1.0s ease-out, transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)' 
          : 'opacity 1.0s ease-out, transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        pointerEvents: fadeOutIntro ? 'auto' : 'none'
      }}>
        <div className="new-glass-card">
          {/* Brand Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '30px',
            gap: '12px'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              overflow: 'hidden',
              boxShadow: '0 0 24px rgba(123, 97, 255, 0.55), 0 0 40px rgba(255, 215, 0, 0.12)'
            }}>
              <img src="/parkhub_logo_owner.png" alt="ParkHub Owner Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(255, 23, 68, 0.1)',
              border: '1px solid rgba(255, 23, 68, 0.2)',
              color: '#FF1744',
              padding: '12px',
              borderRadius: '10px',
              fontSize: '12px',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted, #78909C)', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>Email or Phone Number</label>
              <input
                type="text"
                value={emailOrPhone}
                onChange={(e) => { setEmailOrPhone(e.target.value); setError(''); }}
                placeholder="email@mymail.com or +91 94440 12345"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: '#0d0d0d',
                  border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                  borderRadius: '12px',
                  color: '#FFF',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted, #78909C)', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '14px 44px 14px 16px',
                    background: '#0d0d0d',
                    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                    borderRadius: '12px',
                    color: '#FFF',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted, #78909C)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="glow-button"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '700',
                marginTop: '10px'
              }}
            >
              Secure Login
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  if (onGoogleLogin) await onGoogleLogin();
                } catch (e) {
                  setError(e.message || "Google sign-in failed.");
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '12px',
                color: '#FFF',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: '600',
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxSizing: 'border-box'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span>Sign in with Google</span>
            </button>
          </form>

          {/* Quick Demo Connections */}
          <div style={{ marginTop: '32px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              marginBottom: '16px'
            }}>
              <div style={{ height: '1px', background: 'var(--border-color, rgba(255, 255, 255, 0.08))', flex: 1 }} />
              <span style={{ fontSize: '10px', color: 'var(--text-muted, #78909C)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Quick Connect Demo</span>
              <div style={{ height: '1px', background: 'var(--border-color, rgba(255, 255, 255, 0.08))', flex: 1 }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => handleQuickLogin("suresh@spotowner.com", "owner123")}
                style={{
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color, rgba(255, 255, 255, 0.08))',
                  borderRadius: '10px',
                  color: 'var(--text-secondary, #B0BEC5)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <span>👤 Parking Host Portal</span>
                <span style={{ color: 'var(--primary, #00E676)', fontSize: '10px', fontWeight: 'bold' }}>Suresh Perumal</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
