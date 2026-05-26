'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { AuthModal } from '@/components/auth/AuthModal'
import { getDocs, collection } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, Home, Users, CreditCard, Wrench, Shield, Bell, BarChart3, ArrowRight, CheckCircle, Star, Menu, X } from 'lucide-react'

const features = [
  { icon: Building2, title: 'Building Management', description: 'Manage multiple buildings, floors, and units with ease' },
  { icon: Home, title: 'Unit Tracking', description: 'Track occupancy, vacancies, and unit details in real-time' },
  { icon: CreditCard, title: 'Automated Billing', description: 'Generate monthly invoices with 15+ line items automatically' },
  { icon: Users, title: 'User Roles', description: '7 distinct roles with role-based access control' },
  { icon: Wrench, title: 'Maintenance', description: 'Smart ticket management with auto-assignment' },
  { icon: Shield, title: 'Security', description: 'Visitor management and access control' },
  { icon: Bell, title: 'Notifications', description: 'Real-time alerts for payments, complaints, and more' },
  { icon: BarChart3, title: 'Analytics', description: 'Comprehensive reports and visual dashboards' },
]

const stats = [
  { value: '200+', label: 'Units Managed' },
  { value: '3', label: 'Buildings' },
  { value: '1000+', label: 'Residents' },
  { value: '99.99%', label: 'Uptime' },
]

const testimonials = [
  { name: 'Raj Kumar', role: 'Property Manager', text: 'Sunrise AMS has transformed how we manage our apartment complex. Everything is streamlined!', avatar: 'RK' },
  { name: 'Sarah Gurung', role: 'Resident', text: 'The online payment system and maintenance requests make life so much easier.', avatar: 'SG' },
  { name: 'Milan Karki', role: 'Building Owner', text: 'Complete visibility into my property operations. Highly recommended!', avatar: 'MK' },
]

function LandingContent() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [checkingSetup, setCheckingSetup] = useState(true)

  useEffect(() => {
    // Check if Super Admin exists
    const checkSuperAdmin = async () => {
      try {
        // Fallback timeout in case Firestore hangs indefinitely
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
        const fetchPromise = async () => {
          const usersCollection = collection(db, 'users')
          const snapshot = await getDocs(usersCollection)
          let hasSuperAdmin = false
          snapshot.forEach((doc: any) => {
            if (doc.data().role === 'SUPER_ADMIN' && doc.data().status === 'approved') {
              hasSuperAdmin = true
            }
          })
          return hasSuperAdmin
        }
        
        const hasSuperAdmin = await Promise.race([fetchPromise(), timeout])

        if (!hasSuperAdmin && !user) {
          router.push('/setup')
        }
      } catch (err) {
        console.error('Error checking Super Admin:', err)
      } finally {
        setCheckingSetup(false)
      }
    }

    checkSuperAdmin()
  }, [user, router])

  useEffect(() => {
    if (!loading && !checkingSetup) {
      if (user) {
        router.push('/dashboard')
      }
    }
  }, [user, loading, router, checkingSetup])

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-500 font-medium">Checking system setup...</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-500 font-medium">Authenticating...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-emerald-50/30">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/80">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Sunrise AMS</span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#about" className="text-gray-600 hover:text-gray-900 transition-colors">About</a>
              <a href="#testimonials" className="text-gray-600 hover:text-gray-900 transition-colors">Testimonials</a>
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" onClick={() => setAuthModalOpen(true)}>Sign In</Button>
              <Button onClick={() => setAuthModalOpen(true)}>Get Started</Button>
            </div>

            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white px-4 py-4 space-y-4">
            <a href="#features" className="block text-gray-600" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#about" className="block text-gray-600" onClick={() => setMobileMenuOpen(false)}>About</a>
            <a href="#testimonials" className="block text-gray-600" onClick={() => setMobileMenuOpen(false)}>Testimonials</a>
            <div className="pt-4 border-t flex flex-col gap-3">
              <Button variant="outline" className="w-full justify-center" onClick={() => { setMobileMenuOpen(false); setAuthModalOpen(true); }}>Sign In</Button>
              <Button className="w-full justify-center" onClick={() => { setMobileMenuOpen(false); setAuthModalOpen(true); }}>Get Started</Button>
            </div>
          </div>
        )}
      </header>

      <section 
        className="pt-32 pb-20 px-4 relative bg-cover bg-center"
        style={{ backgroundImage: 'url("/apartment-bg.jpg")' }}
      >
        <div className="absolute inset-0 bg-white/85 backdrop-blur-[2px]"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center">
            <Badge variant="secondary" className="mb-4">🏢 Nakhhu-13, Lalitpur, Nepal</Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Sunrise<br />
              <span className="text-primary">Apartment</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Streamline your apartment management with automated billing, maintenance tracking, 
              visitor management, and comprehensive analytics—all in one platform.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-2">Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Everything You Need</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              A comprehensive solution designed for modern apartment management
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="p-6 rounded-2xl border bg-gray-50 hover:bg-white hover:shadow-lg transition-all group">
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                  <feature.icon className="h-6 w-6 text-primary group-hover:text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-2">Why Choose Us</Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Built for Modern Property Management
              </h2>
              <div className="space-y-4">
                {[
                  'Automated monthly invoice generation',
                  'Real-time payment tracking',
                  'Role-based access for 7 user types',
                  'Smart maintenance ticket system',
                  'Visitor & parking management',
                  'Comprehensive reporting & analytics',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-2">Testimonials</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">What Users Say</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white border shadow-sm">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-medium">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-12 px-4 bg-gray-950 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-primary">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">Sunrise AMS</span>
              </div>
              <p className="text-gray-400 text-sm">Modern property management solution for apartment complexes in Nepal.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>Nakhhu-13, Lalitpur</li>
                <li>nakhhu@sunrise.com.np</li>
                <li>+977-01-5185110</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
            © 2026 Sunrise Apartment Management System. All rights reserved.
          </div>
        </div>
      </footer>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  )
}

export default function HomePage() {
  return (
    <LandingContent />
  )
}