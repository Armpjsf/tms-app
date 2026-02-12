
import { DriversContent } from "@/components/drivers/drivers-content"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminDriversPage(props: Props) {
  const searchParams = await props.searchParams

  return (
    // @ts-ignore
    <DriversContent searchParams={searchParams} />
  )
}
