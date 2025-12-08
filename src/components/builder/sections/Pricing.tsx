
export default function Pricing({ items=[] }) {
  return <section>{items.map((i,idx)=><div key={idx}>{i.name}:{i.price}</div>)}</section>;
}
