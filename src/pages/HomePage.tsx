import { useState } from "react";
import HeroBanner from "../components/HeroBanner";
import FeaturedApps from "../components/FeaturedApps";
import AllApps from "../components/AllApps";

interface HomePageProps {
  search: string;
}

export default function HomePage({ search }: HomePageProps) {
  const [category, setCategory] = useState("all");

  return (
    <>
      <HeroBanner />
      <FeaturedApps search={search} />
      <AllApps search={search} category={category} onCategoryChange={setCategory} />
    </>
  );
}
