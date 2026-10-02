import ShortSyncEditor from './ShortSyncEditor'

type Props = { params: { slug: string } }

export default function ShortEditorPage({ params }: Props) {
  return <ShortSyncEditor slug={params.slug} />
}
