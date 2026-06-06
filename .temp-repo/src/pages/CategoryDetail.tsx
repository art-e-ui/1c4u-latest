import { Navigate, useParams } from "react-router-dom";

export default function CategoryDetail() {
  const { slug } = useParams();
  return <Navigate to={`/categories?cat=${slug}`} replace />;
}
