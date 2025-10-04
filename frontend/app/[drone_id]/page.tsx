export default async function Page({
	params,
}: {
	params: Promise<{ drone_id: string }>;
}) {
	const { drone_id } = await params;
	return <div>Drone {drone_id}</div>;
}
