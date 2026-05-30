'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ShieldAlert, 
  Scale, 
  HelpCircle, 
  Trash2, 
  Search, 
  Printer, 
  ShieldCheck, 
  Clock, 
  Flame, 
  ArrowRight, 
  Award, 
  Heart, 
  Activity, 
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  FileText
} from 'lucide-react'

interface SLAMatrixRow {
  tier: string
  classification: string
  examples: string
  response: string
  resolution: string
  badgeColor: string
  badgeVariant: 'destructive' | 'warning' | 'secondary' | 'success' | 'outline' | 'default'
}

const SLA_MATRIX: SLAMatrixRow[] = [
  {
    tier: 'Priority 1: Emergency',
    classification: 'Life safety, entrapments, structural threats',
    examples: 'Active passenger lift entrapments, absolute grid-power blackouts, major plumbing bursts threatening structural or property damage, active security breaches, or physical safety hazards.',
    response: 'Immediate (< 15 Minutes)',
    resolution: 'Within 2 to 4 Hours',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    badgeVariant: 'destructive'
  },
  {
    tier: 'Priority 2: Urgent',
    classification: 'Major system failures, leaks, light outages',
    examples: 'Partial localized electrical outages, steady water line leaks, malfunction of peripheral access control/gate barriers, gym/pool equipment failures, or primary common area lighting failures.',
    response: 'Within 2 Hours',
    resolution: 'Within 24 Hours',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    badgeVariant: 'warning'
  },
  {
    tier: 'Priority 3: Routine',
    classification: 'Minor repairs, billing queries, touch-ups',
    examples: 'Non-structural indoor plumbing repairs, minor individual billing or payment ledger queries, club facility booking scheduling issues, or cosmetic paint touch-ups.',
    response: 'Within 12 Hours',
    resolution: 'Within 3 Working Days',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeVariant: 'success'
  }
]

export default function SLAPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'matrix' | 'standards' | 'financials' | 'escalation'>('all')

  const filteredMatrix = SLA_MATRIX.filter(row => 
    row.tier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.examples.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.response.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.resolution.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handlePrint = () => {
    window.print()
  }

  return (
    <DashboardLayout title="Service Level Agreement (SLA)">
      <div className="space-y-8 max-w-7xl mx-auto pb-12 print:p-0">
        
        {/* Header Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 md:p-10 shadow-2xl border border-white/10 print:bg-white print:text-black print:shadow-none print:border-none">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-indigo-400/30 bg-indigo-500/10 text-indigo-300 font-semibold px-3 py-1 rounded-full uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 animate-pulse" />
                </Badge>
                <Badge variant="outline" className="border-white/10 bg-white/5 text-white/80 font-medium text-[10px] rounded-full">
                  Effective: June 1, 2026
                </Badge>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-200">
                Service Level Agreement (SLA)
              </h2>
              <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
                Baseline operational framework for municipal, technical, security, and administrative services provided by the <span className="font-semibold text-white">Sunrise Apartment Welfare Society (SAWS)</span>.
              </p>
            </div>
            
            <div className="flex flex-row md:flex-col items-start gap-3 justify-end shrink-0 print:hidden">
              <Button onClick={handlePrint} variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 font-medium flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Print Document
              </Button>
              <div className="text-right text-xs text-slate-400 hidden md:block">
                <p>Issued By: SAWS Committee</p>
                <p>Review: Annually</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Navigation Panel */}
        <div className="flex flex-col md:flex-row items-center gap-4 justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100 print:hidden">
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {(['all', 'matrix', 'standards', 'financials', 'escalation'] as const).map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'default' : 'ghost'}
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl px-4 py-2 capitalize font-semibold transition-all ${
                  activeTab === tab 
                    ? 'shadow-md shadow-indigo-100 bg-indigo-600 hover:bg-indigo-700' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab === 'all' ? 'Complete SLA' : tab === 'matrix' ? 'Response Matrix' : tab === 'standards' ? 'Operations Standards' : tab === 'financials' ? 'Financials & Conduct' : 'Escalation Tree'}
              </Button>
            ))}
          </div>

          <div className="relative w-full md:w-80 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search policies or terms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border-slate-200 focus-visible:ring-indigo-500"
            />
          </div>
        </div>

        {/* MAIN SLA POLICY DISPLAY */}
        <div className="space-y-8">
          
          {/* SECTION 1: PURPOSE & SCOPE */}
          {(activeTab === 'all' || activeTab === 'standards') && (
            <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Scale className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">1. Purpose & Scope</CardTitle>
                    <CardDescription className="text-xs">Baseline parameters, accountability, and applicability</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6 text-sm text-slate-600 leading-relaxed">
                <div>
                  <h4 className="font-semibold text-slate-800 mb-1">1.1 Objectives</h4>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li>Establish objective, measurable benchmarks for facility management operations.</li>
                    <li>Define clear, time-bound accountability frameworks for onsite management personnel.</li>
                    <li>Outline the reciprocal operational obligations required from residents to maintain community infrastructure.</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 mb-1">1.2 Applicability</h4>
                  <p>
                    This agreement governs all stakeholders residing in, working at, or managing the estate. This includes property owners, tenants, onsite facility management staff, and third-party contracted service agencies.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SECTION 2: COMPLAINT CATEGORIZATION & RESPONSE MATRIX */}
          {(activeTab === 'all' || activeTab === 'matrix') && (
            <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                <div className="flex items-center gap-3 justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-slate-900">2. Complaint Categorization & Response Matrix</CardTitle>
                      <CardDescription className="text-xs">Strict incident classification and escalation windows</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  The Sunrise Apartment Welfare Society Helpdesk commits to receiving, logging, and acting upon maintenance requests within strict performance parameters based on severity.
                </p>
                
                <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-inner">
                  <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-700 font-semibold">
                        <th className="p-4 w-48">Severity Tier</th>
                        <th className="p-4 w-72">Incident Examples</th>
                        <th className="p-4 w-52">Triage & Response Target</th>
                        <th className="p-4 w-52">Resolution / Stabilization</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMatrix.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-400">
                            No SLA severity parameters found matching search query.
                          </td>
                        </tr>
                      ) : (
                        filteredMatrix.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 font-semibold vertical-top">
                              <Badge className={`border uppercase tracking-wider font-semibold text-[10px] rounded-full px-2.5 py-1 ${row.badgeColor}`} variant={row.badgeVariant}>
                                {row.tier}
                              </Badge>
                            </td>
                            <td className="p-4 vertical-top">
                              <p className="font-semibold text-slate-800 text-xs mb-1">{row.classification}</p>
                              <p className="text-xs text-slate-500 leading-relaxed">{row.examples}</p>
                            </td>
                            <td className="p-4 vertical-top font-medium text-slate-800">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-4.5 w-4.5 text-indigo-500" />
                                <span>{row.response}</span>
                              </div>
                            </td>
                            <td className="p-4 vertical-top font-semibold text-slate-900">
                              <div className="flex items-center gap-1.5">
                                <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
                                <span>{row.resolution}</span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* SECTION 3: FACILITY OPERATIONS & MAINTENANCE STANDARDS */}
          {(activeTab === 'all' || activeTab === 'standards') && (
            <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">3. Facility Operations & Maintenance Standards</CardTitle>
                    <CardDescription className="text-xs">Baseline execution timelines for municipal, administrative, and premium amenities</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-8 text-sm">
                
                {/* 3.1 Sanitation, Hygiene & Waste Systems */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2 border-slate-100">
                    <span className="font-bold text-indigo-600">3.1</span>
                    <h4 className="font-bold text-slate-800">Sanitation, Hygiene, & Waste Systems</h4>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Daily Upkeep</span>
                      <p className="font-bold text-slate-800 mt-1 mb-1">Common Area Cleaning</p>
                      <p className="text-xs text-slate-600 leading-relaxed">corridors, lobbies, stairwells washed/disinfected before <span className="font-semibold text-indigo-600">10:00 AM</span> daily.</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Waste Collection</span>
                      <p className="font-bold text-slate-800 mt-1 mb-1">Domestic Refuse</p>
                      <p className="text-xs text-slate-600 leading-relaxed">Collected once daily between <span className="font-semibold text-indigo-600">8:00 AM - 11:00 AM</span>. Segregation is mandatory.</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Preventative Schedule</span>
                      <p className="font-bold text-slate-800 mt-1 mb-1">Deep Infrastructure</p>
                      <p className="text-xs text-slate-600 leading-relaxed">Rainwater channels, trenches, and sewage structures cleared <span className="font-semibold text-indigo-600">Quarterly</span>.</p>
                    </div>
                  </div>
                </div>

                {/* 3.2 Security, Surveillance & Access Control */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2 border-slate-100">
                    <span className="font-bold text-indigo-600">3.2</span>
                    <h4 className="font-bold text-slate-800">Security, Surveillance, & Access Control</h4>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Physical Guarding</span>
                      <p className="font-bold text-slate-800 mt-1 mb-1">Perimeter & Gates</p>
                      <p className="text-xs text-slate-600 leading-relaxed">Manned actively by licensed security officers <span className="font-semibold text-indigo-600">24 / 7 / 365</span>.</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Visitor Verification</span>
                      <p className="font-bold text-slate-800 mt-1 mb-1">Integrity Protocols</p>
                      <p className="text-xs text-slate-600 leading-relaxed">Delivery personnel/visitors must authenticate via app or resident phone validation prior to entry.</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Electronic System</span>
                      <p className="font-bold text-slate-800 mt-1 mb-1">CCTV Archives</p>
                      <p className="text-xs text-slate-600 leading-relaxed"><span className="font-semibold text-indigo-600">98% operational uptime</span> target. Footage stored securely for rolling 30 days window.</p>
                    </div>
                  </div>
                </div>

                {/* 3.3 Utility Management: Power & Water Backups */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2 border-slate-100">
                    <span className="font-bold text-indigo-600">3.3</span>
                    <h4 className="font-bold text-slate-800">Utility Management: Power & Water Backups</h4>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-600 font-semibold px-2 py-0.5 text-[10px]">DG Backup</Badge>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Emergency Power</span>
                      </div>
                      <p className="font-bold text-slate-800 mb-1">DG Backups Trigger Window</p>
                      <p className="text-xs text-slate-600 leading-relaxed">Generator will auto-start and energize residential lights, lifts, water pumps, and stairs within <span className="font-bold text-amber-600">30 seconds</span> of a grid blackout.</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-600 font-semibold px-2 py-0.5 text-[10px]">Peak Supply</Badge>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Water Utility</span>
                      </div>
                      <p className="font-bold text-slate-800 mb-1">Pressurized Domestic Water Hours</p>
                      <p className="text-xs text-slate-600 leading-relaxed">Reliably active twice daily during designated windows: Morning <span className="font-bold text-indigo-600">6:00 AM - 10:00 AM</span>, Evening <span className="font-bold text-indigo-600">6:00 PM - 10:00 PM</span>.</p>
                    </div>
                  </div>
                </div>

                {/* 3.4 Premium Amenities & Asset Management */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2 border-slate-100">
                    <span className="font-bold text-indigo-600">3.4</span>
                    <h4 className="font-bold text-slate-800">Premium Amenities & Asset Management</h4>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-indigo-50/20 p-4 rounded-2xl border border-indigo-100/50">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">🏋️ Gymnasium Assets</span>
                      <p className="font-bold text-slate-800 mt-1 mb-1">Operations & Hygiene</p>
                      <p className="text-xs text-slate-600 leading-relaxed">Open 5:00 AM - 10:00 AM & 5:00 PM - 9:00 PM. Machines wiped twice daily with disinfectant. Frayed hardware repaired within <span className="font-semibold text-indigo-600">48 hours</span>.</p>
                    </div>
                    <div className="bg-indigo-50/20 p-4 rounded-2xl border border-indigo-100/50">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">🏊 Pool Chemistry</span>
                      <p className="font-bold text-slate-800 mt-1 mb-1">Aquatic Facility Uptime</p>
                      <p className="text-xs text-slate-600 leading-relaxed">Chemistry tested and balanced <span className="font-semibold text-indigo-600">twice daily</span>. Closed instantly if biological or water clarity indicators fail local public standards.</p>
                    </div>
                    <div className="bg-indigo-50/20 p-4 rounded-2xl border border-indigo-100/50">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">🛗 Lifts Availability</span>
                      <p className="font-bold text-slate-800 mt-1 mb-1">Elevator Emergency Rescue</p>
                      <p className="text-xs text-slate-600 leading-relaxed"><span className="font-semibold text-indigo-600">99% availability</span> metric required monthly. Entrapped passenger emergency extraction team must deploy to site within <span className="font-semibold text-indigo-600">15 minutes</span>.</p>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          )}

          {/* SECTION 4: RESIDENT OBLIGATIONS & FINANCIAL PERFORMANCE */}
          {(activeTab === 'all' || activeTab === 'financials') && (
            <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">4. Resident Obligations & Financial Performance</CardTitle>
                    <CardDescription className="text-xs">Deadlines, penalties, code of conduct, and rules compliance</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6 text-sm text-slate-600 leading-relaxed">
                <div className="grid md:grid-cols-2 gap-6">
                  
                  {/* Financial Standards */}
                  <div className="space-y-3 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2 pb-1 border-b">
                      <Badge className="bg-emerald-600 hover:bg-emerald-700">Financials</Badge>
                      <h4 className="font-bold text-slate-800">Deadlines & Late Penalties</h4>
                    </div>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span><span className="font-semibold text-slate-800">Billing Cycle</span>: Monthly invoices issued on the <span className="font-bold text-slate-900">1st day</span> of each month.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span><span className="font-semibold text-slate-800">Payment Deadline</span>: Payments strictly due by the <span className="font-bold text-slate-900">10th day</span>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span><span className="font-semibold text-slate-800">Grace Period</span>: Standard grace window extended through the <span className="font-bold text-slate-900">15th day</span>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span>
                          <span className="font-semibold text-slate-800">Late Administrative Fee</span>: Any balance past the 15th automatically incurs a flat <span className="font-bold text-red-600">$15.00 late fee</span>.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span>
                          <span className="font-semibold text-slate-800">Interest Accruals</span>: Unpaid accounts accrue interest at <span className="font-bold text-red-600">12% per annum</span> calculated daily from the original 10th-day deadline until cleared.
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Rules Compliance */}
                  <div className="space-y-3 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-2 pb-1 border-b">
                      <Badge className="bg-indigo-600">Compliance</Badge>
                      <h4 className="font-bold text-slate-800">Code of Conduct Rules</h4>
                    </div>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <span><span className="font-semibold text-slate-800">Acoustic Quiet Hours</span>: Drilling, loud audio, social gatherings prohibited from <span className="font-semibold text-slate-800">10:00 PM to 7:00 AM</span> daily.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <span><span className="font-semibold text-slate-800">Domestic Pet Control</span>: Leashes mandatory in all shared common areas. Pet owners must instantly clean pet waste dropped on common grounds.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                        <span><span className="font-semibold text-slate-800">Parking Allocations</span>: Vehicles must park strictly in their assigned bays. Parking in unassigned thoroughfares/fire lanes leads to immediate clamping or towing at owner's expense.</span>
                      </li>
                    </ul>
                  </div>

                </div>
              </CardContent>
            </Card>
          )}

          {/* SECTION 5: ESCALATION MATRIX */}
          {(activeTab === 'all' || activeTab === 'escalation') && (
            <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <SlidersHorizontal className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">5. Escalation Matrix</CardTitle>
                    <CardDescription className="text-xs">Recourse timeline path when service limits or resolution target windows are breached</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-sm text-slate-600 mb-8 leading-relaxed">
                  When a logged ticket or service issue is not handled within the timelines specified in Section 2, residents have the right to systematically escalate the matter through the management chain of command.
                </p>

                {/* VISUAL TREE FLOW CHART */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                  
                  {/* LEVEL 1 */}
                  <div className="relative bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center flex flex-col justify-between hover:shadow-sm transition-all">
                    <div>
                      <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center mx-auto mb-2 text-sm">1</div>
                      <p className="font-bold text-slate-800 text-sm">Helpdesk Supervisor</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Level 1 Escalation</p>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">Shift Helpdesk Supervisor / Onsite Technical Lead to triage initial work orders.</p>
                  </div>

                  {/* LEVEL 2 */}
                  <div className="relative bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center flex flex-col justify-between hover:shadow-sm transition-all">
                    <div className="absolute top-1/2 -left-3 -translate-y-1/2 hidden md:block text-slate-300">
                      <ChevronRight className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center mx-auto mb-2 text-sm">2</div>
                      <p className="font-bold text-slate-800 text-sm">Facility Manager</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Level 2 Escalation</p>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">Assigned if problem remains unresolved past the initial SLA resolution target window.</p>
                  </div>

                  {/* LEVEL 3 */}
                  <div className="relative bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center flex flex-col justify-between hover:shadow-sm transition-all">
                    <div className="absolute top-1/2 -left-3 -translate-y-1/2 hidden md:block text-slate-300">
                      <ChevronRight className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center mx-auto mb-2 text-sm">3</div>
                      <p className="font-bold text-slate-800 text-sm">Committee Secretary</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Level 3 Escalation</p>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">Triggered if the problem remains unaddressed 48 hours after reaching Level 2.</p>
                  </div>

                  {/* LEVEL 4 */}
                  <div className="relative bg-indigo-900 p-5 rounded-2xl text-center flex flex-col justify-between text-white shadow-md">
                    <div className="absolute top-1/2 -left-3 -translate-y-1/2 hidden md:block text-indigo-700">
                      <ChevronRight className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="h-8 w-8 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center mx-auto mb-2 text-sm">4</div>
                      <p className="font-bold text-indigo-100 text-sm">SAWS President</p>
                      <p className="text-[10px] font-semibold text-indigo-300 mt-0.5">Final Execution Level</p>
                    </div>
                    <p className="text-[11px] text-indigo-200 mt-3 leading-relaxed">President of the Sunrise Apartment Welfare Society for final executive review & binding decision.</p>
                  </div>

                </div>
              </CardContent>
            </Card>
          )}

          {/* SECTION 6: AMENDMENTS, GOVERNANCE & SIGN-OFF */}
          {activeTab === 'all' && (
            <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">6. Amendments, Governance, & Sign-off</CardTitle>
                    <CardDescription className="text-xs">Living administrative framework execution parameters</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 text-sm text-slate-600 leading-relaxed space-y-6">
                <p>
                  This document operates as a living administrative framework. Any additions, policy adjustments, or structural changes to this SLA require a formal review. Amendments must be introduced, debated, and passed by a simple majority vote of members present during a scheduled Annual General Meeting (AGM) or an Extraordinary General Meeting (EGM) of the society.
                </p>
                
                {/* Signature Panel */}
                <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-100 max-w-xl">
                  <div className="space-y-4">
                    <p className="font-bold text-slate-800">For and on behalf of SAWS:</p>
                    <div className="border-b border-dashed border-slate-300 h-10 w-full" />
                    <div className="text-xs text-slate-500">
                      <p className="font-semibold text-slate-700">President</p>
                      <p>Sunrise Apartment Welfare Society</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="font-bold text-slate-800">Attested By:</p>
                    <div className="border-b border-dashed border-slate-300 h-10 w-full" />
                    <div className="text-xs text-slate-500">
                      <p className="font-semibold text-slate-700">Secretary</p>
                      <p>Sunrise Apartment Welfare Society</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        </div>

      </div>
    </DashboardLayout>
  )
}
