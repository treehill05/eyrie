export default function Page({ params }: { params: { drone_id: string } }) {
	return <div>Drone {params.drone_id}</div>;
}
