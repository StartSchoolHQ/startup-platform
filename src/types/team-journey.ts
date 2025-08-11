export interface User {
  id: string
  name: string
  avatar: string
}

export interface Product {
  id: string
  name: string
  description: string
  status: "Active" | "Inactive"
  customers: {
    count: number
    label: string
  }
  revenue: {
    amount: number
    label: string
  }
  points: {
    amount: number
    label: string
  }
  avatar: string
  teamMembers: User[]
  category?: string
}

export interface TeamJourneyData {
  allProducts: Product[]
  myProducts: Product[]
  archive: Product[]
}
