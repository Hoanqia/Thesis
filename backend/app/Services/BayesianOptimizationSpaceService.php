<?php 

namespace App\Services;
use App\Models\BayesianOptimizationSpace;

class BayesianOptimizationSpaceService{

    public function getAll(){
        return BayesianOptimizationSpace::all();
    }
    public function findById($id){
        return BayesianOptimizationSpace::findOrFaild($id);
    }
    public function create(array $data){
        return BayesianOptimizationSpace::create($data);
    }
    public function update(array $data,int $id){
        $space = BayesianOptimizationSpace::find($id);
        $space->update($data);
        return $space;
    }

     public function bulkUpdate(array $updates): bool
    {
        foreach ($updates as $update) {
            if (!isset($update['id']) || !isset($update['data'])) {
                // Bỏ qua các đối tượng không hợp lệ
                continue;
            }

            $space = BayesianOptimizationSpace::find($update['id']);

            if ($space) {
                $space->update($update['data']);
            }
        }
        
        return true;
    }
    
    public function delete($id){
        $space = BayesianOptimizationSpace::find($id);
        return $space->delete();
    }
}
?>