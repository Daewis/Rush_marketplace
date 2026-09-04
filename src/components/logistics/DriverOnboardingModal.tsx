import React, { useState } from 'react';
import { X, Bike, ShieldCheck, Loader2, FileText, CheckCircle2 } from 'lucide-react';
import { onboardingApi } from '@/lib/api';
import { handleApiError } from '@/lib/api';
import { toast } from 'sonner';
import { useAppStore } from '@/store/app-store';

interface RiderOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VEHICLE_OPTIONS = [
  { value: 'MOTORCYCLE', label: 'Motorcycle' },
  { value: 'TRICYCLE', label: 'Keke (Tricycle)' },
  { value: 'CAR', label: 'Car' },
  { value: 'VAN', label: 'Van' },
  { value: 'BICYCLE', label: 'Bicycle (errands only)' },
];

const MOBILITY_OPTIONS = [
  { value: 'DELIVERY', label: 'Deliver goods', description: 'Pickup + dropoff of products, packages, errands' },
  { value: 'PASSENGER_RIDES', label: 'Transport passengers', description: 'Carry passengers (requires passenger-rated vehicle)' },
];

/**
 * Full rider application flow — replaces the old single-step
 * DriverOnboardingModal.
 *
 * Three steps:
 *   1. Vehicle registration (type, make, model, year, plate)
 *   2. License verification (number + optional document URL)
 *   3. Mobility capabilities (what kinds of work you want)
 *
 * On submit, calls /api/onboarding/rider which:
 *   - Creates the Vehicle record (verificationStatus: PENDING)
 *   - Creates the Driver (RiderProfile) record
 *   - Adds RIDER capability in PENDING_VERIFICATION state
 *
 * The user CANNOT go online until an admin approves via
 * /api/admin/approve-capability. This is the only onboarding route
 * that does NOT auto-activate the capability — carrying passengers or
 * delivering goods without verification is a regulatory + safety risk.
 */
export const DriverOnboardingModal: React.FC<RiderOnboardingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { setUser, user } = useAppStore();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Vehicle
  const [vehicleType, setVehicleType] = useState<string>('MOTORCYCLE');
  const [vehicleMake, setVehicleMake] = useState<string>('');
  const [vehicleModel, setVehicleModel] = useState<string>('');
  const [vehicleYear, setVehicleYear] = useState<string>('');
  const [vehiclePlateNumber, setVehiclePlateNumber] = useState<string>('');

  // Step 2: License
  const [licenseNumber, setLicenseNumber] = useState<string>('');
  const [licenseDocumentUrl, setLicenseDocumentUrl] = useState<string>('');

  // Step 3: Mobility capabilities
  const [mobilityCapabilities, setMobilityCapabilities] = useState<string[]>(['DELIVERY']);

  if (!isOpen) return null;

  const toggleMobility = (cap: string) => {
    setMobilityCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  const canProceedStep1 = vehicleType && vehicleMake.trim() && vehicleModel.trim() && vehiclePlateNumber.trim();
  const canProceedStep2 = licenseNumber.trim();
  const canSubmit = canProceedStep1 && canProceedStep2 && mobilityCapabilities.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      toast.error('Please complete all required fields');
      return;
    }
    setSubmitting(true);
    try {
      const response = await onboardingApi.rider({
        vehicleType,
        vehicleMake: vehicleMake.trim(),
        vehicleModel: vehicleModel.trim(),
        vehicleYear: vehicleYear ? Number(vehicleYear) : undefined,
        vehiclePlateNumber: vehiclePlateNumber.trim().toUpperCase(),
        licenseNumber: licenseNumber.trim().toUpperCase(),
        licenseDocumentUrl: licenseDocumentUrl.trim() || undefined,
        mobilityCapabilities,
      });

      if (!response.data?.success) {
        toast.error(response.data?.message || 'Could not submit rider application');
        setSubmitting(false);
        return;
      }

      // Sync the new capability state into the local store — the
      // backend has added RIDER to capabilities[] and set its status
      // to PENDING_VERIFICATION. The user can now switch to the
      // rider workspace (where they'll see the "pending approval"
      // state) but cannot accept deliveries yet.
      const responseData = response.data.data as any;
      if (user) {
        setUser({
          ...user,
          capabilities: (responseData?.capabilities || [...(user as any).capabilities, 'RIDER']).map((c: string) =>
            c.toUpperCase()
          ),
          capability_status: responseData?.capability_status || {
            ...(user as any).capability_status,
            RIDER: 'PENDING_VERIFICATION',
          },
          active_workspace: 'RIDER',
        } as any);
      }

      toast.success('Rider application submitted! We will review your license and vehicle before activating your rider capability.');

      // Reset for next time
      setStep(1);
      setVehicleMake('');
      setVehicleModel('');
      setVehicleYear('');
      setVehiclePlateNumber('');
      setLicenseNumber('');
      setLicenseDocumentUrl('');
      setMobilityCapabilities(['DELIVERY']);

      onClose();
    } catch (err: any) {
      toast.error(handleApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Bike className="w-5 h-5 text-orange-600" />
            <h3 className="font-extrabold text-base text-slate-900">
              Become a Rider — Step {step} of 3
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full ${
                s <= step ? 'bg-orange-500' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {step === 1 && (
            <>
              <div className="text-xs text-slate-600 mb-2">
                Register the vehicle you'll use for deliveries or passenger rides.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Vehicle Type
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none cursor-pointer"
                >
                  {VEHICLE_OPTIONS.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Make</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bajaj"
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Model</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Boxer"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Year</label>
                  <input
                    type="number"
                    placeholder="e.g. 2022"
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Plate Number</label>
                  <input
                    type="text"
                    required
                    placeholder="LND-234-XA"
                    value={vehiclePlateNumber}
                    onChange={(e) => setVehiclePlateNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none font-mono uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canProceedStep1}
                  onClick={() => setStep(2)}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-bold text-xs rounded-lg shadow-xs"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-xs text-slate-600 mb-2">
                Provide your rider's license for verification. We don't display this publicly —
                it's only used for the admin verification review.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Driver's License Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LAG-0123456789"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  License Document URL (optional)
                </label>
                <input
                  type="url"
                  placeholder="https://...upload.jpg"
                  value={licenseDocumentUrl}
                  onChange={(e) => setLicenseDocumentUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none"
                />
                <div className="text-[10px] text-slate-500 mt-1">
                  Photo or scan of your license. Required for verification — without it, approval takes longer.
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] text-amber-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Your rider capability will be in <b>PENDING_VERIFICATION</b> state until an admin
                  reviews your license and vehicle. You can browse the rider workspace but cannot
                  accept deliveries or passenger rides until approved.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!canProceedStep2}
                  onClick={() => setStep(3)}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-bold text-xs rounded-lg shadow-xs"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="text-xs text-slate-600 mb-2">
                What kinds of work do you want to do? You can change this later.
              </div>

              <div className="space-y-2">
                {MOBILITY_OPTIONS.map((opt) => {
                  const checked = mobilityCapabilities.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleMobility(opt.value)}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left ${
                        checked
                          ? 'border-orange-300 bg-orange-50'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                          checked ? 'bg-orange-600 border-orange-600' : 'border-slate-300'
                        }`}
                      >
                        {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-bold text-slate-800">{opt.label}</div>
                        <div className="text-[10px] text-slate-600">{opt.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-[11px] text-orange-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <span>
                  A single account can be <b>Customer + Rider</b> (or even + Vendor + Service
                  Provider). You can still buy products and hire services while earning as a rider.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
                  disabled={submitting}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit || submitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-bold text-xs rounded-lg shadow-xs"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
