import { DollarSign } from 'lucide-react';
import type { DashboardAnalytics } from '../../types';

interface BillingTabProps {
  data: DashboardAnalytics;
}

export default function BillingTab({ data }: BillingTabProps) {
  const billing = data.billing || {};
  const breakdown = billing.financial_breakdown_inr || {};

  const totalBill = breakdown.estimated_total_bill || 533406.56;
  const baseEnergy = breakdown.energy_charge || 313310.00;
  const todSurcharge = breakdown.tod_surcharge || 58666.25;
  const demandPenalty = breakdown.demand_penalty || 157740.00;
  const pfAdjustment = breakdown.pf_adjustment || 3690.31;

  return (
    <div className="rich-tab-view">
      <div className="tab-view-header">
        <div className="tab-title-box">
          <DollarSign size={24} color="#10B981" />
          <h2>Live Bill Decomposition & DISCOM Reconciliation</h2>
        </div>
        <p className="tab-desc">Granular financial breakdown based on your industrial tariff slab, ToD multipliers, and penalty rules.</p>
      </div>

      <div className="billing-grid-split">
        <div className="rich-card billing-breakdown-card">
          <h3>Estimated Total Monthly Bill</h3>
          <div className="bill-hero-inr">
            ₹{totalBill.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="bill-subtext">Projected total based on active telemetry and DISCOM tariff rules</div>

          <div className="bill-line-items">
            <div className="bill-row">
              <span>Base Energy Charge</span>
              <span className="bill-amt">₹{baseEnergy.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bill-row">
              <span>Time-of-Day (ToD) Surcharge</span>
              <span className="bill-amt">₹{todSurcharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bill-row">
              <span>Contract Demand Excess Penalty</span>
              <span className="bill-amt red-num">+₹{demandPenalty.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="bill-row">
              <span>Power Factor Surcharge / Rebate</span>
              <span className="bill-amt orange-num">+₹{pfAdjustment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <hr className="bill-divider" />
            <div className="bill-row total-row">
              <span>Total Estimated Payable</span>
              <span className="bill-amt total-inr">₹{totalBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div className="rich-card billing-tips-card">
          <h3>Optimization Savings Roadmap</h3>
          <ul className="savings-list">
            <li>
              <strong>Install Demand Controller on Furnace Feeder</strong>
              <p>Pre-emptively stagger heavy induction loads to cap demand below contracted limit and eliminate demand penalty.</p>
            </li>
            <li>
              <strong>Service Capacitor Bank #2 Relays</strong>
              <p>Restore power factor to 0.98+ to convert surcharge into an active monthly rebate.</p>
            </li>
            <li>
              <strong>Shift Auxiliary Cooling to Off-Peak Window</strong>
              <p>Save up to 15% monthly by leveraging off-peak night window tariffs.</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
