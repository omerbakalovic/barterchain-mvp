'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type LocalItem = {
  id: number
  title: string
  wanted: string
  city: string
  priority: boolean
  claimed: boolean
}

const STORAGE_KEY = 'barterchain-local-items'

const starterItems: LocalItem[] = [
  { id: 1, title: 'Mountain bike helmet', wanted: 'Phone tripod', city: 'Berlin', priority: false, claimed: false },
  { id: 2, title: 'Desk lamp', wanted: 'Indoor plant', city: 'Hamburg', priority: true, claimed: false },
]

export default function LocalPage() {
  const [items, setItems] = useState<LocalItem[]>(starterItems)
  const [offer, setOffer] = useState('')
  const [want, setWant] = useState('')
  const [city, setCity] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return

    try {
      const saved = JSON.parse(raw) as LocalItem[]
      if (Array.isArray(saved) && saved.length) setItems(saved)
    } catch {
      // ignore malformed localStorage values
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items

    return items.filter((item) =>
      [item.title, item.wanted, item.city].some((field) => field.toLowerCase().includes(q))
    )
  }, [items, query])

  const availableCount = items.filter((item) => !item.claimed).length

  const addItem = () => {
    if (!offer.trim() || !want.trim() || !city.trim()) return

    setItems((prev) => [
      {
        id: Date.now(),
        title: offer.trim(),
        wanted: want.trim(),
        city: city.trim(),
        priority: false,
        claimed: false,
      },
      ...prev,
    ])

    setOffer('')
    setWant('')
    setCity('')
  }

  const toggleClaimed = (id: number) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, claimed: !item.claimed } : item)))
  }

  const togglePriority = (id: number) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, priority: !item.priority } : item)))
  }

  const clearClaimed = () => {
    setItems((prev) => prev.filter((item) => !item.claimed))
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Local swap board</h1>
            <p className="text-slate-600">A simple local-only prototype with add/search/claim behavior.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/">Back to landing</Link>
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Total posts</CardDescription>
              <CardTitle>{items.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Available now</CardDescription>
              <CardTitle>{availableCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Priority posts</CardDescription>
              <CardTitle>{items.filter((item) => item.priority).length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add new local offer</CardTitle>
            <CardDescription>All fields are required for posting.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-4">
            <input
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              placeholder="Offering"
              className="rounded-md border bg-white px-3 py-2"
            />
            <input
              value={want}
              onChange={(e) => setWant(e.target.value)}
              placeholder="Want"
              className="rounded-md border bg-white px-3 py-2"
            />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
              className="rounded-md border bg-white px-3 py-2"
            />
            <Button onClick={addItem}>Add post</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current posts</CardTitle>
            <CardDescription>Filter by offer/want/city, then mark items as claimed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by item or city"
                className="w-full rounded-md border bg-white px-3 py-2"
              />
              <Button variant="secondary" onClick={clearClaimed}>Clear claimed</Button>
            </div>

            <ul className="space-y-3">
              {filteredItems.map((item) => (
                <li key={item.id} className="flex flex-col gap-3 rounded-md border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className={item.claimed ? 'opacity-60 line-through' : ''}>
                    <p className="font-semibold">{item.title} → {item.wanted}</p>
                    <p className="text-sm text-slate-600">{item.city} {item.priority ? '• Priority' : ''}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => togglePriority(item.id)}>
                      {item.priority ? 'Unmark priority' : 'Mark priority'}
                    </Button>
                    <Button onClick={() => toggleClaimed(item.id)}>
                      {item.claimed ? 'Unclaim' : 'Claimed'}
                    </Button>
                  </div>
                </li>
              ))}
              {filteredItems.length === 0 && (
                <li className="rounded-md border border-dashed bg-white p-4 text-sm text-slate-600">No posts match your filter yet.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
